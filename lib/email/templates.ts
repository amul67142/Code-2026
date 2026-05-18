import { sendEmail } from "./sender";

// ── Shared Layout ───────────────────────────────────────────────
function layout(content: string) {
  return `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; padding:0; background:#f4f5f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  .wrap { max-width:560px; margin:0 auto; padding:40px 20px; }
  .card { background:#fff; border-radius:12px; padding:32px; border:1px solid #e5e7eb; }
  .btn { display:inline-block; padding:12px 28px; background:#111827; color:#fff !important; text-decoration:none; border-radius:8px; font-weight:600; font-size:14px; }
  .footer { text-align:center; padding:24px 0 0; font-size:12px; color:#9ca3af; }
  h1 { margin:0 0 16px; font-size:22px; color:#111827; }
  p { margin:0 0 14px; font-size:14px; line-height:1.6; color:#374151; }
  .highlight { background:#f0f9ff; border-left:4px solid #3b82f6; padding:12px 16px; border-radius:0 8px 8px 0; margin:16px 0; }
  .meta { font-size:13px; color:#6b7280; }
</style></head>
<body><div class="wrap"><div class="card">${content}</div>
<div class="footer">Powered by RealLeads CRM</div></div></body></html>`;
}

// ── 1. Welcome Email ────────────────────────────────────────────
export function getWelcomeEmailHtml(name: string) {
  return layout(`
    <h1>Welcome aboard, ${name}!</h1>
    <p>Your account has been created and your company workspace is ready. Here's what you can do next:</p>
    <div class="highlight">
      <p style="margin:0"><strong>✅ Add your first lead</strong> — Start building your pipeline</p>
    </div>
    <div class="highlight">
      <p style="margin:0"><strong>📋 Setup your pipeline</strong> — Customize stages for your workflow</p>
    </div>
    <div class="highlight">
      <p style="margin:0"><strong>👥 Invite your team</strong> — Add agents from Settings → Team</p>
    </div>
    <p style="margin-top:24px"><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://bigload.site"}/dashboard" class="btn">Go to Dashboard →</a></p>
  `);
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: "Welcome to RealLeads CRM! 🎉",
    html: getWelcomeEmailHtml(name),
  });
}

// ── 2. Team Invite Email ────────────────────────────────────────
export function getInviteEmailHtml(inviterName: string, companyName: string, inviteUrl: string) {
  return layout(`
    <h1>You've been invited! 🤝</h1>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on RealLeads CRM.</p>
    <p>Click the button below to accept the invitation and set up your account:</p>
    <p style="margin-top:24px; text-align:center"><a href="${inviteUrl}" class="btn">Accept Invite →</a></p>
    <p class="meta" style="margin-top:16px">This invite link will expire in 7 days.</p>
  `);
}

export async function sendInviteEmail(to: string, inviterName: string, companyName: string, inviteUrl: string) {
  return sendEmail({
    to,
    subject: `${inviterName} invited you to ${companyName} on RealLeads`,
    html: getInviteEmailHtml(inviterName, companyName, inviteUrl),
  });
}

// ── 3. New Lead Assigned Email ───────────────────────────────────
export function getNewLeadEmailHtml(agentName: string, leadName: string, leadPhone: string, source: string, leadUrl: string) {
  return layout(`
    <h1>New Lead Assigned 📥</h1>
    <p>Hi ${agentName}, a new lead has been assigned to you:</p>
    <div class="highlight">
      <p style="margin:0 0 4px"><strong>${leadName}</strong></p>
      <p class="meta" style="margin:0">📞 ${leadPhone || "No phone"} &nbsp; · &nbsp; 📌 ${source || "Unknown source"}</p>
    </div>
    <p><a href="${leadUrl}" class="btn">View Lead →</a></p>
  `);
}

export async function sendNewLeadEmail(to: string, agentName: string, leadName: string, leadPhone: string, source: string, leadUrl: string) {
  return sendEmail({
    to,
    subject: `New lead assigned: ${leadName}`,
    html: getNewLeadEmailHtml(agentName, leadName, leadPhone, source, leadUrl),
  });
}

// ── 4. Task Reminder Email ──────────────────────────────────────
export function getTaskReminderEmailHtml(agentName: string, taskType: string, leadName: string, dueAt: string, leadUrl: string) {
  return layout(`
    <h1>Task Reminder ⏰</h1>
    <p>Hi ${agentName}, you have an upcoming task:</p>
    <div class="highlight">
      <p style="margin:0 0 4px"><strong>${taskType}</strong> — ${leadName}</p>
      <p class="meta" style="margin:0">📅 Due: ${dueAt}</p>
    </div>
    <p><a href="${leadUrl}" class="btn">View Lead →</a></p>
  `);
}

export async function sendTaskReminderEmail(to: string, agentName: string, taskType: string, leadName: string, dueAt: string, leadUrl: string) {
  return sendEmail({
    to,
    subject: `⏰ Task reminder: ${taskType} with ${leadName}`,
    html: getTaskReminderEmailHtml(agentName, taskType, leadName, dueAt, leadUrl),
  });
}

// ── 5. Task Overdue Email ───────────────────────────────────────
export function getTaskOverdueEmailHtml(agentName: string, overdueCount: number) {
  return layout(`
    <h1>Overdue Tasks 🚨</h1>
    <p>Hi ${agentName}, you have <strong>${overdueCount} overdue task(s)</strong> that need your attention.</p>
    <p>Please review and complete them as soon as possible to keep your leads engaged.</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://bigload.site"}/tasks" class="btn">View Tasks →</a></p>
  `);
}

export async function sendTaskOverdueEmail(to: string, agentName: string, overdueCount: number) {
  return sendEmail({
    to,
    subject: `🚨 You have ${overdueCount} overdue task(s)`,
    html: getTaskOverdueEmailHtml(agentName, overdueCount),
  });
}

// ── 6. Daily Digest Email ───────────────────────────────────────
export function getDailyDigestEmailHtml(name: string, stats: { newLeads: number; tasksDue: number; overdueCount: number }) {
  return layout(`
    <h1>Good morning, ${name}! ☀️</h1>
    <p>Here's your daily summary:</p>
    <div class="highlight">
      <p style="margin:0">📥 <strong>${stats.newLeads}</strong> new lead(s) yesterday</p>
    </div>
    <div class="highlight">
      <p style="margin:0">📋 <strong>${stats.tasksDue}</strong> task(s) due today</p>
    </div>
    ${stats.overdueCount > 0 ? `<div class="highlight" style="border-color:#ef4444">
      <p style="margin:0;color:#ef4444">🚨 <strong>${stats.overdueCount}</strong> overdue task(s)</p>
    </div>` : ""}
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://bigload.site"}/dashboard" class="btn">Open Dashboard →</a></p>
  `);
}

export async function sendDailyDigestEmail(to: string, name: string, stats: { newLeads: number; tasksDue: number; overdueCount: number }) {
  return sendEmail({
    to,
    subject: `📊 Your daily digest — ${new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`,
    html: getDailyDigestEmailHtml(name, stats),
  });
}

// ── 7. Lead Stage Change Email ──────────────────────────────────
export function getStageChangeEmailHtml(agentName: string, leadName: string, oldStage: string, newStage: string, leadUrl: string) {
  return layout(`
    <h1>Lead Stage Updated 🔄</h1>
    <p>Hi ${agentName}, a lead has moved to a new stage:</p>
    <div class="highlight">
      <p style="margin:0 0 4px"><strong>${leadName}</strong></p>
      <p class="meta" style="margin:0">${oldStage} → <strong>${newStage}</strong></p>
    </div>
    <p><a href="${leadUrl}" class="btn">View Lead →</a></p>
  `);
}

export async function sendStageChangeEmail(to: string, agentName: string, leadName: string, oldStage: string, newStage: string, leadUrl: string) {
  return sendEmail({
    to,
    subject: `Lead moved: ${leadName} → ${newStage}`,
    html: getStageChangeEmailHtml(agentName, leadName, oldStage, newStage, leadUrl),
  });
}

// ── 8. Password Reset Email ─────────────────────────────────────
export function getPasswordResetEmailHtml(name: string, resetUrl: string) {
  return layout(`
    <h1>Password Reset 🔑</h1>
    <p>Hi ${name}, we received a request to reset your password.</p>
    <p>Click the button below to set a new password:</p>
    <p style="text-align:center; margin-top:24px"><a href="${resetUrl}" class="btn">Reset Password →</a></p>
    <p class="meta" style="margin-top:16px">If you didn't request this, you can safely ignore this email.</p>
  `);
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: "Reset your RealLeads password",
    html: getPasswordResetEmailHtml(name, resetUrl),
  });
}

// ── 9. Trial Expiry Warning Email ───────────────────────────────
export function getTrialExpiryEmailHtml(name: string, daysLeft: number) {
  return layout(`
    <h1>Trial Ending Soon ⏳</h1>
    <p>Hi ${name}, your RealLeads CRM trial expires in <strong>${daysLeft} day(s)</strong>.</p>
    <p>Upgrade now to keep all your data, leads, and pipeline configured:</p>
    <p style="text-align:center; margin-top:24px"><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://bigload.site"}/settings/billing" class="btn">Upgrade Now →</a></p>
  `);
}

export async function sendTrialExpiryEmail(to: string, name: string, daysLeft: number) {
  return sendEmail({
    to,
    subject: `Your trial expires in ${daysLeft} day(s)`,
    html: getTrialExpiryEmailHtml(name, daysLeft),
  });
}

// ── 10. Weekly Report Email ─────────────────────────────────────
export function getWeeklyReportEmailHtml(name: string, stats: { totalLeads: number; newLeads: number; leadsWon: number; leadsLost: number; tasksCompleted: number }) {
  return layout(`
    <h1>Weekly Report 📈</h1>
    <p>Hi ${name}, here's how your team performed this week:</p>
    <table style="width:100%; border-collapse:collapse; margin:16px 0">
      <tr><td style="padding:8px 0; border-bottom:1px solid #e5e7eb; font-size:14px">📥 New Leads</td><td style="padding:8px 0; border-bottom:1px solid #e5e7eb; font-size:14px; font-weight:700; text-align:right">${stats.newLeads}</td></tr>
      <tr><td style="padding:8px 0; border-bottom:1px solid #e5e7eb; font-size:14px">🏆 Won</td><td style="padding:8px 0; border-bottom:1px solid #e5e7eb; font-size:14px; font-weight:700; text-align:right; color:#16a34a">${stats.leadsWon}</td></tr>
      <tr><td style="padding:8px 0; border-bottom:1px solid #e5e7eb; font-size:14px">❌ Lost</td><td style="padding:8px 0; border-bottom:1px solid #e5e7eb; font-size:14px; font-weight:700; text-align:right; color:#dc2626">${stats.leadsLost}</td></tr>
      <tr><td style="padding:8px 0; border-bottom:1px solid #e5e7eb; font-size:14px">✅ Tasks Completed</td><td style="padding:8px 0; border-bottom:1px solid #e5e7eb; font-size:14px; font-weight:700; text-align:right">${stats.tasksCompleted}</td></tr>
      <tr><td style="padding:8px 0; font-size:14px">📊 Total Pipeline</td><td style="padding:8px 0; font-size:14px; font-weight:700; text-align:right">${stats.totalLeads}</td></tr>
    </table>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://bigload.site"}/reports" class="btn">View Full Reports →</a></p>
  `);
}

export async function sendWeeklyReportEmail(to: string, name: string, stats: { totalLeads: number; newLeads: number; leadsWon: number; leadsLost: number; tasksCompleted: number }) {
  return sendEmail({
    to,
    subject: `📈 Weekly report — ${new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`,
    html: getWeeklyReportEmailHtml(name, stats),
  });
}
