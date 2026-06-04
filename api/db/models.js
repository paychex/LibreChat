const mongoose = require('mongoose');
const { createModels } = require('@librechat/data-schemas');
const models = createModels(mongoose);

// The Project model was removed upstream in v0.8.6 but retained here for Paychex
// functionality and test compatibility (Prompt.spec.js, Agent.js, Prompt.js).
const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    promptGroupIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'PromptGroup',
      default: [],
    },
    agentIds: {
      type: [String],
      ref: 'Agent',
      default: [],
    },
  },
  { timestamps: true },
);

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

module.exports = { ...models, Project };
