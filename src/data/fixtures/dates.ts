// Dynamic reference dates for realistic prototype fixtures
const now = new Date();

export const todayDateStr = now.toISOString().split('T')[0];
export const yesterdayDateStr = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
export const twoDaysAgoDateStr = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().split('T')[0];
export const threeDaysAgoDateStr = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString().split('T')[0];
