/**
 * Project model helpers - the Project model was removed upstream in v0.8.6 but is
 * retained here for Paychex functionality (Prompt.js, Agent.js, Prompt.spec.js).
 * The schema is registered in api/db/models.js.
 */

const { Project } = require('~/db/models');

const removeAgentFromAllProjects = async (agentId) => {
  await Project.updateMany({}, { $pull: { agentIds: agentId } });
};

const removeAgentIdsFromProject = async (projectId, agentIds) => {
  await Project.updateOne({ _id: projectId }, { $pull: { agentIds: { $in: agentIds } } });
};

const addAgentIdsToProject = async (projectId, agentIds) => {
  await Project.updateOne({ _id: projectId }, { $addToSet: { agentIds: { $each: agentIds } } });
};

const removeGroupFromAllProjects = async (groupId) => {
  await Project.updateMany({}, { $pull: { promptGroupIds: groupId } });
};

const removeGroupIdsFromProject = async (projectId, groupIds) => {
  await Project.updateOne(
    { _id: projectId },
    { $pull: { promptGroupIds: { $in: groupIds } } },
  );
};

const addGroupIdsToProject = async (projectId, groupIds) => {
  await Project.updateOne(
    { _id: projectId },
    { $addToSet: { promptGroupIds: { $each: groupIds } } },
  );
};

const getProjectByName = async (name) => {
  return Project.findOne({ name }).lean();
};

module.exports = {
  removeAgentFromAllProjects,
  removeAgentIdsFromProject,
  addAgentIdsToProject,
  removeGroupFromAllProjects,
  removeGroupIdsFromProject,
  addGroupIdsToProject,
  getProjectByName,
};
