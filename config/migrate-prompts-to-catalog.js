const path = require('path');
const crypto = require('crypto');
const { logger } = require('@librechat/data-schemas');
const { ResourceType, PrincipalType } = require('librechat-data-provider');

require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const connect = require('./connect');

const { PromptGroup, Prompt, User, AclEntry, Project } = require('~/db/models');

const GLOBAL_PROJECT_NAME = 'instance';
const TRACKING_COLLECTION_NAME = 'promptCatalogMigrations';
const CATALOG_CATEGORY = 'Other';
const CATALOG_AI_TOOL = 'LibreChat';
const HTTP_TIMEOUT_MS = 15_000;

/**
 * Builds the same `x-forwarded-user-*` headers LibreChat's own
 * `buildPromptCatalogHeaders` (packages/api/src/promptCatalog/handlers.ts) sends
 * per authenticated request — reimplemented here since this script has no
 * Express request/JWT context of its own.
 */
function buildPromptCatalogHeaders(email, name) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (email) {
    headers['x-forwarded-user-email'] = email;
  }
  const forwardedName = name || email;
  if (forwardedName) {
    headers['x-forwarded-user-name'] = forwardedName;
  }
  return headers;
}

function buildCatalogCreateUrl(promptCatalogApiUrl) {
  const normalizedApiUrl = promptCatalogApiUrl.endsWith('/')
    ? promptCatalogApiUrl
    : `${promptCatalogApiUrl}/`;
  return new URL('api/prompts', normalizedApiUrl).toString();
}

function hashContent(title, content) {
  return crypto.createHash('sha256').update(`${title}\u0000${content}`).digest('hex');
}

function getTimeoutSignal(timeoutMs) {
  return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(timeoutMs)
    : undefined;
}

/** PromptGroup ids listed in the global/"instance" project — treated as not strictly private. */
async function getGlobalProjectPromptGroupIds() {
  const project = await Project.findOne({ name: GLOBAL_PROJECT_NAME })
    .select('promptGroupIds')
    .lean();
  return new Set((project?.promptGroupIds || []).map((id) => id.toString()));
}

/** PromptGroup ids with an ACL grant to anyone other than the group's own author. */
async function getAclSharedPromptGroupIds() {
  const shared = await AclEntry.aggregate([
    { $match: { resourceType: ResourceType.PROMPTGROUP } },
    {
      $lookup: {
        from: 'promptgroups',
        localField: 'resourceId',
        foreignField: '_id',
        as: 'group',
      },
    },
    { $unwind: '$group' },
    {
      $match: {
        $expr: {
          $or: [
            { $ne: ['$principalType', PrincipalType.USER] },
            { $ne: ['$principalId', '$group.author'] },
          ],
        },
      },
    },
    { $group: { _id: '$resourceId' } },
  ]);
  return new Set(shared.map((doc) => doc._id.toString()));
}

/**
 * Creates one prompt in the Paychex Prompt Catalog via its HTTP API, using the
 * given author's identity (matching the trust model LibreChat's own
 * `/api/prompthub/catalog` route already relies on).
 */
async function createCatalogPrompt({ promptCatalogApiUrl, title, content, impact, email, name }) {
  const response = await fetch(buildCatalogCreateUrl(promptCatalogApiUrl), {
    method: 'POST',
    headers: buildPromptCatalogHeaders(email, name),
    body: JSON.stringify({
      title,
      content,
      category: CATALOG_CATEGORY,
      ai_tool: CATALOG_AI_TOOL,
      impact: impact || undefined,
      is_public: false,
      tags: [],
    }),
    signal: getTimeoutSignal(HTTP_TIMEOUT_MS),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data && (data.error || data.message)) || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

async function migratePromptsToCatalog({ dryRun = true, batchSize = 25 } = {}) {
  await connect();

  const promptCatalogApiUrl = process.env.PROMPT_CATALOG_API_URL;
  if (!promptCatalogApiUrl) {
    throw new Error('PROMPT_CATALOG_API_URL is not configured');
  }

  logger.info('Starting Prompt Catalog Migration', { dryRun, batchSize });

  const mongoose = require('mongoose');
  const db = mongoose.connection.db;
  const trackingCollection = db.collection(TRACKING_COLLECTION_NAME);

  const [globalProjectGroupIds, aclSharedGroupIds, migratedGroupIds] = await Promise.all([
    getGlobalProjectPromptGroupIds(),
    getAclSharedPromptGroupIds(),
    trackingCollection.distinct('promptGroupId').then((ids) => ids.map((id) => id.toString())),
  ]);

  const allGroups = await PromptGroup.find({})
    .select('_id name author authorName oneliner productionId')
    .lean();

  const stats = {
    scanned: allGroups.length,
    excludedGlobalProject: 0,
    excludedAclShared: 0,
    skippedNoText: 0,
    skippedNoEmail: 0,
    alreadyMigrated: 0,
    eligible: 0,
    migrated: 0,
    errors: 0,
  };

  const eligibleGroups = [];
  for (const group of allGroups) {
    const groupId = group._id.toString();
    if (globalProjectGroupIds.has(groupId)) {
      stats.excludedGlobalProject++;
      continue;
    }
    if (aclSharedGroupIds.has(groupId)) {
      stats.excludedAclShared++;
      continue;
    }
    if (migratedGroupIds.includes(groupId)) {
      stats.alreadyMigrated++;
      continue;
    }
    eligibleGroups.push(group);
  }
  stats.eligible = eligibleGroups.length;

  logger.info('PromptGroup eligibility breakdown:\n' + JSON.stringify(stats, null, 2));

  if (dryRun) {
    return { ...stats, dryRun: true };
  }

  for (let i = 0; i < eligibleGroups.length; i += batchSize) {
    const batch = eligibleGroups.slice(i, i + batchSize);
    logger.info(
      `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(eligibleGroups.length / batchSize)}`,
    );

    for (const group of batch) {
      try {
        const prodPrompt = group.productionId
          ? await Prompt.findById(group.productionId).select('prompt').lean()
          : null;
        if (!prodPrompt?.prompt) {
          stats.skippedNoText++;
          logger.warn(`Skipping promptGroup "${group.name}" — no production prompt text`, {
            groupId: group._id,
          });
          continue;
        }

        const author = group.author
          ? await User.findById(group.author).select('email name').lean()
          : null;
        const email = author?.email;
        if (!email) {
          stats.skippedNoEmail++;
          logger.warn(`Skipping promptGroup "${group.name}" — no resolvable author email`, {
            groupId: group._id,
          });
          continue;
        }

        const title = group.name;
        const content = prodPrompt.prompt;
        const created = await createCatalogPrompt({
          promptCatalogApiUrl,
          title,
          content,
          impact: group.oneliner,
          email,
          name: author.name || group.authorName,
        });

        await trackingCollection.insertOne({
          promptGroupId: group._id,
          catalogPromptId: created?.id,
          contentHash: hashContent(title, content),
          migratedAt: new Date(),
        });

        stats.migrated++;
        logger.debug(`Migrated promptGroup "${title}" to catalog id=${created?.id}`, {
          groupId: group._id,
        });
      } catch (error) {
        stats.errors++;
        logger.error(`Failed to migrate promptGroup "${group.name}"`, {
          groupId: group._id,
          error: error.message,
        });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  logger.info('Prompt Catalog migration completed', stats);
  return stats;
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  const batchSize =
    parseInt(process.argv.find((arg) => arg.startsWith('--batch-size='))?.split('=')[1], 10) || 25;

  migratePromptsToCatalog({ dryRun, batchSize })
    .then((result) => {
      console.log(`\n=== ${dryRun ? 'DRY RUN ' : ''}MIGRATION RESULTS ===`);
      console.log(JSON.stringify(result, null, 2));
      if (dryRun) {
        console.log('\nTo run the actual migration, remove the --dry-run flag');
      }
      process.exit(result.errors > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Prompt Catalog migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migratePromptsToCatalog };
