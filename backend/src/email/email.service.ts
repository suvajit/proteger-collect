import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  private getTransporter() {
    return nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: parseInt(this.config.get('SMTP_PORT') ?? '587'),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  async getNotificationEmail(): Promise<string | null> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: 'notification_email' },
    });
    return setting?.value ?? null;
  }

  async sendSheetSubmittedEmail(sheet: {
    id: string;
    sheetDate: Date;
    supervisor: { fullName: string; username: string };
    entries: Array<{
      itemTitle: string;
      categoryName: string;
      status: string;
      remark: string | null;
      completedAt: Date | null;
    }>;
  }) {
    const to = await this.getNotificationEmail();
    const smtpHost = this.config.get('SMTP_HOST');
    if (!to || !smtpHost) return; // Email not configured

    const total = sheet.entries.length;
    const done = sheet.entries.filter((e) => e.status === 'done').length;
    const issues = sheet.entries.filter((e) => e.status === 'issue');
    const na = sheet.entries.filter((e) => e.status === 'na').length;
    const pending = sheet.entries.filter((e) => e.status === 'pending').length;
    const completionPct = Math.round((done / total) * 100);
    const dateStr = new Date(sheet.sheetDate).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const issueRows = issues.map((e) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;font-size:13px;">${e.categoryName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;font-size:13px;">${e.itemTitle}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;font-size:13px;color:#991b1b;">${e.remark ?? '—'}</td>
      </tr>`).join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:#1a56db;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Checksheet Submitted</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px;">${dateStr}</p>
    </div>

    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;font-size:15px;color:#374151;">
        <strong>${sheet.supervisor.fullName}</strong> has submitted today's maintenance checksheet.
      </p>

      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#059669;">${done}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Completed</div>
        </div>
        <div style="flex:1;background:${issues.length > 0 ? '#fef2f2' : '#f9fafb'};border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:${issues.length > 0 ? '#dc2626' : '#9ca3af'};">${issues.length}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Issues Found</div>
        </div>
        <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#6b7280;">${pending}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Pending</div>
        </div>
        <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#1a56db;">${completionPct}%</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Completion</div>
        </div>
      </div>

      ${issues.length > 0 ? `
      <h3 style="font-size:15px;font-weight:700;color:#991b1b;margin:0 0 12px;">⚠ Issues Reported (${issues.length})</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #fee2e2;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#fee2e2;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#991b1b;text-transform:uppercase;">Category</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#991b1b;text-transform:uppercase;">Item</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#991b1b;text-transform:uppercase;">Remark</th>
          </tr>
        </thead>
        <tbody>${issueRows}</tbody>
      </table>` : `
      <p style="color:#059669;font-weight:600;margin-bottom:24px;">✓ No issues reported in this submission.</p>`}

      <p style="font-size:12px;color:#9ca3af;margin:0;">
        Sheet ID: ${sheet.id} · Submitted at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  </div>
</body>
</html>`;

    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: this.config.get('SMTP_FROM') ?? `"Proteger Collect" <${this.config.get('SMTP_USER')}>`,
        to,
        subject: `[Proteger] Checksheet Submitted — ${dateStr} by ${sheet.supervisor.fullName}`,
        html,
      });
      this.logger.log(`Submission email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send submission email: ${err}`);
    }
  }
}
