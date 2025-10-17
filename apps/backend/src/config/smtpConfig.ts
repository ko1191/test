import { z } from 'zod';

const smtpEnvSchema = z.object({
  SMTP_HOST: z.string().trim().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().trim().min(1, 'SMTP_USER is required'),
  SMTP_PASSWORD: z.string().min(1, 'SMTP_PASSWORD is required'),
  SMTP_FROM: z.string().trim().min(1, 'SMTP_FROM is required')
});

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
};

const isTruthyString = (value: string | undefined) => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

export function getSmtpConfig(): SmtpConfig {
  const env = smtpEnvSchema.parse(process.env);

  const port = env.SMTP_PORT ?? 587;
  const secure = env.SMTP_SECURE ? isTruthyString(env.SMTP_SECURE) : port === 465;

  return {
    host: env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD
    },
    from: env.SMTP_FROM
  };
}
