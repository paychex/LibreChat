/**
 * Project model stubs - the Project model was deprecated upstream in v0.8.6.
 * These functions are retained as no-ops for backward compatibility with code
 * that still references them (Agent.js, Prompt.js).
 */

const removeAgentFromAllProjects = async () => {};

const removeAgentIdsFromProject = async () => {};

const addAgentIdsToProject = async () => {};

const removeGroupFromAllProjects = async () => {};

const removeGroupIdsFromProject = async () => {};

const addGroupIdsToProject = async () => {};

const getProjectByName = async () => null;

module.exports = {
  removeAgentFromAllProjects,
  removeAgentIdsFromProject,
  addAgentIdsToProject,
  removeGroupFromAllProjects,
  removeGroupIdsFromProject,
  addGroupIdsToProject,
  getProjectByName,
};
