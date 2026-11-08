import { SecretFinding, SecuritySeverity } from '../types';

export interface SecretPatternRule {
  provider: SecretFinding['provider'];
  secretType: string;
  regex: RegExp;
  severity: SecuritySeverity;
  envVarPrefix: string;
  revocationGuide: string;
  rotationUrl: string;
}

export const SECRET_RULES: SecretPatternRule[] = [
  {
    provider: 'OPENAI',
    secretType: 'OpenAI API Secret Key',
    regex: /sk-(?:proj-|none-)?[a-zA-Z0-9_-]{32,80}/g,
    severity: 'CRITICAL',
    envVarPrefix: 'OPENAI_API_KEY',
    revocationGuide: 'Acesse o OpenAI Platform Dashboard > API Keys e revogue esta chave imediatamente. Gere uma nova chave com permissões restritas.',
    rotationUrl: 'https://platform.openai.com/api-keys',
  },
  {
    provider: 'GITHUB_TOKEN',
    secretType: 'GitHub Personal Access Token (Classic / Fine-Grained)',
    regex: /(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{60,100})/g,
    severity: 'CRITICAL',
    envVarPrefix: 'GITHUB_TOKEN',
    revocationGuide: 'Acesse GitHub Settings > Developer Settings > Personal Access Tokens e exclua o token comprometido imediatamente.',
    rotationUrl: 'https://github.com/settings/tokens',
  },
  {
    provider: 'GOOGLE',
    secretType: 'Google Cloud / Gemini API Key',
    regex: /AIzaSy[a-zA-Z0-9_-]{33}/g,
    severity: 'HIGH',
    envVarPrefix: 'GEMINI_API_KEY',
    revocationGuide: 'Acesse o Google Cloud Console > APIs & Services > Credentials, delete a chave comprometida e configure restrições de IP/HTTP referer.',
    rotationUrl: 'https://console.cloud.google.com/apis/credentials',
  },
  {
    provider: 'AWS',
    secretType: 'AWS Access Key ID',
    regex: /(?:AKIA|ASIA|AROA)[0-9A-Z]{16}/g,
    severity: 'CRITICAL',
    envVarPrefix: 'AWS_ACCESS_KEY_ID',
    revocationGuide: 'No AWS IAM Console, desative o par de Access Key imediatamente, crie uma nova chave e verifique o CloudTrail para acessos não autorizados.',
    rotationUrl: 'https://console.aws.amazon.com/iam/home#/security_credentials',
  },
  {
    provider: 'STRIPE',
    secretType: 'Stripe Secret / Restricted Key',
    regex: /(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,60}/g,
    severity: 'CRITICAL',
    envVarPrefix: 'STRIPE_SECRET_KEY',
    revocationGuide: 'No Dashboard Stripe > Desenvolvedores > Chaves de API, clique em Roll key / Revoke imediatamente para invalidar transações não autorizadas.',
    rotationUrl: 'https://dashboard.stripe.com/apikeys',
  },
  {
    provider: 'DATABASE_URL',
    secretType: 'Database Connection String with Credentials',
    regex: /(?:postgres|postgresql|mysql|mongodb|mongodb\+srv):\/\/[^:\s]+:([^@\s]{4,})@[^\s"']+/gi,
    severity: 'CRITICAL',
    envVarPrefix: 'DATABASE_URL',
    revocationGuide: 'Altere a senha do usuário do banco de dados no painel do seu provedor (Supabase, Neon, AWS RDS, MongoDB Atlas) e atualize as variáveis do servidor.',
    rotationUrl: 'https://console.cloud.google.com/sql',
  },
  {
    provider: 'SLACK',
    secretType: 'Slack Bot Token / Webhook',
    regex: /(?:xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,34}|https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]+\/B[0-9A-Z]+\/[0-9a-zA-Z]+)/g,
    severity: 'HIGH',
    envVarPrefix: 'SLACK_BOT_TOKEN',
    revocationGuide: 'No Slack API Dashboard > Your Apps > OAuth & Permissions, revogue o token ou desative o webhook afetado.',
    rotationUrl: 'https://api.slack.com/apps',
  },
  {
    provider: 'PRIVATE_KEY',
    secretType: 'Asymmetric Private Key (RSA / EC / OpenSSH)',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    severity: 'CRITICAL',
    envVarPrefix: 'SERVER_PRIVATE_KEY',
    revocationGuide: 'Remova a chave pública correspondente de ~/.ssh/authorized_keys de todos os servidores remotos e gere um novo par ed25519.',
    rotationUrl: 'https://github.com/settings/keys',
  },
];

/**
 * Masks a detected secret so it is NEVER exposed in logs, reports, UI or PRs.
 * Example: sk-proj-1234567890abcdef1234567890 -> sk-proj-1234...[REDACTED_SECRET]...7890
 */
export function maskSecretValue(raw: string): string {
  if (!raw || raw.length < 8) return '••••••••[REDACTED]••••••••';
  const headLen = Math.min(6, Math.floor(raw.length / 4));
  const tailLen = Math.min(4, Math.floor(raw.length / 4));
  const head = raw.slice(0, headLen);
  const tail = raw.slice(-tailLen);
  return `${head}••••••[REDACTED_SECRET]••••••${tail}`;
}

export interface ScanResult {
  findings: SecretFinding[];
  sanitizedFileContent?: string;
  hasModifications: boolean;
  generatedEnvExample: string;
}

export function scanFileForSecrets(repoId: string, repoName: string, filePath: string, content: string): ScanResult {
  const findings: SecretFinding[] = [];
  let sanitized = content;
  const envVarsToAdd: { key: string; placeholder: string; comment: string }[] = [];

  const lines = content.split('\n');

  for (const rule of SECRET_RULES) {
    const matches = Array.from(content.matchAll(rule.regex));
    for (const match of matches) {
      const rawVal = match[0];
      const matchIndex = match.index ?? 0;
      
      // Determine line number
      const before = content.slice(0, matchIndex);
      const lineNumber = before.split('\n').length;
      
      const masked = maskSecretValue(rawVal);
      const uniqueId = `sec-${repoName}-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${lineNumber}-${findings.length + 1}`;
      
      // Variable name heuristic
      let varName = rule.envVarPrefix;
      if (filePath.endsWith('.env') || filePath.endsWith('.env.local')) {
        // Find line variable name if KEY=VALUE format
        const lineContent = lines[lineNumber - 1] || '';
        const eqIdx = lineContent.indexOf('=');
        if (eqIdx > 0) {
          const extractedKey = lineContent.slice(0, eqIdx).trim();
          if (/^[A-Z0-9_]+$/.test(extractedKey)) {
            varName = extractedKey;
          }
        }
      }

      const finding: SecretFinding = {
        id: uniqueId,
        repoId,
        repoName,
        filePath,
        lineNumber,
        provider: rule.provider,
        secretType: rule.secretType,
        maskedValue: masked,
        envVarProposed: varName,
        safePlaceholder: `your_${varName.toLowerCase()}_here`,
        severity: rule.severity,
        status: 'DETECTED',
        revocationGuide: rule.revocationGuide,
        rotationUrl: rule.rotationUrl,
      };

      findings.push(finding);

      envVarsToAdd.push({
        key: varName,
        placeholder: `your_${varName.toLowerCase()}_here`,
        comment: `# ${rule.secretType} (Sanitizado automaticamente pelo GitHub Intelligence AI)`,
      });

      // Replacement proposal:
      // If code file (js, ts, py, go):
      if (filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
        sanitized = sanitized.split(rawVal).join(`process.env.${varName}`);
      } else if (filePath.endsWith('.py')) {
        sanitized = sanitized.split(rawVal).join(`os.getenv('${varName}')`);
      } else if (filePath.endsWith('.env') || filePath.endsWith('.env.production')) {
        sanitized = sanitized.split(rawVal).join(`your_${varName.toLowerCase()}_here`);
      } else {
        sanitized = sanitized.split(rawVal).join(`\${${varName}}`);
      }
    }
  }

  // Generate safe .env.example
  let generatedEnvExample = '# ====================================================================\n# Environment Variables Template (.env.example)\n# Gerado automaticamente pelo GitHub Intelligence AI\n# NUNCA insira chaves reais neste arquivo.\n# ====================================================================\n\n';
  const seenVars = new Set<string>();
  for (const item of envVarsToAdd) {
    if (!seenVars.has(item.key)) {
      seenVars.add(item.key);
      generatedEnvExample += `${item.comment}\n${item.key}="${item.placeholder}"\n\n`;
    }
  }

  return {
    findings,
    sanitizedFileContent: sanitized,
    hasModifications: sanitized !== content,
    generatedEnvExample,
  };
}
