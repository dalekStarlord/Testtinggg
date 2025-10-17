const envCommitSha = import.meta.env.VITE_APP_COMMIT_SHA || '';
const envShortSha = import.meta.env.VITE_APP_SHORT_SHA || (envCommitSha ? envCommitSha.slice(0, 7) : '');
const envMessage = import.meta.env.VITE_APP_COMMIT_MESSAGE || '';
const envEnvironment = import.meta.env.VITE_APP_ENVIRONMENT || import.meta.env.MODE || '';
const envDeployUrl = import.meta.env.VITE_APP_DEPLOY_URL || '';
const envDeployedAt = import.meta.env.VITE_APP_DEPLOYED_AT || '';

export function getEnvVersionInfo() {
  return {
    commitSha: envCommitSha,
    shortSha: envShortSha,
    commitMessage: envMessage,
    environment: envEnvironment,
    deployUrl: envDeployUrl,
    deployedAt: envDeployedAt,
    source: 'env',
  };
}

export function logInitialVersion() {
  const info = getEnvVersionInfo();
  if (!info.commitSha && !info.environment && !info.deployedAt) {
    console.info('[CDO Jeepney Planner] Local development build');
    return;
  }

  const displaySha = info.shortSha || (info.commitSha ? info.commitSha.slice(0, 7) : 'unknown');
  const parts = [
    `[CDO Jeepney Planner] Build ${displaySha}`,
    info.environment ? `env=${info.environment}` : null,
    info.deployedAt ? `built=${info.deployedAt}` : null,
  ].filter(Boolean);

  console.info(parts.join(' | '));
}
