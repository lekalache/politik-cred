import { EmailTemplate } from './mailjet'

/**
 * Welcome email template for new users
 */
export function getWelcomeEmailTemplate(userName: string): EmailTemplate {
  return {
    subject: 'Bienvenue sur Politik Cred\' !',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1E3A8A;">Politik<span style="color: #DC2626;">Cred'</span></h1>
          <p style="color: #6B7280; font-size: 16px;">Plateforme de crédibilité politique</p>
        </div>

        <h2 style="color: #1F2937;">Bonjour ${userName} !</h2>

        <p style="color: #374151; line-height: 1.6;">
          Bienvenue sur Politik Cred', la plateforme citoyenne qui permet d'évaluer la crédibilité
          des élus français à partir de faits publics vérifiés.
        </p>

        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1F2937; margin-top: 0;">Ce que vous pouvez faire maintenant :</h3>
          <ul style="color: #374151;">
            <li>Consulter les profils des élus français</li>
            <li>Participer aux votes sur la crédibilité</li>
            <li>Découvrir notre règlement et nos principes</li>
            <li>Contribuer à une démocratie plus transparente</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://politik-cred.fr"
             style="background-color: #1E3A8A; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Découvrir la plateforme
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">

        <p style="color: #6B7280; font-size: 14px; text-align: center;">
          Politik Cred' - Pour une démocratie plus transparente<br>
          <a href="mailto:contact@politik-cred.fr" style="color: #1E3A8A;">contact@politik-cred.fr</a>
        </p>
      </div>
    `,
    textContent: `
      Bonjour ${userName} !

      Bienvenue sur Politik Cred', la plateforme citoyenne qui permet d'évaluer la crédibilité des élus français à partir de faits publics vérifiés.

      Ce que vous pouvez faire maintenant :
      - Consulter les profils des élus français
      - Participer aux votes sur la crédibilité
      - Découvrir notre règlement et nos principes
      - Contribuer à une démocratie plus transparente

      Découvrir la plateforme : https://politik-cred.fr

      Politik Cred' - Pour une démocratie plus transparente
      contact@politik-cred.fr
    `
  }
}

/**
 * Email verification template
 */
export function getEmailVerificationTemplate(verificationLink: string): EmailTemplate {
  return {
    subject: 'Vérifiez votre adresse email - Politik Cred\'',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1E3A8A;">Politik<span style="color: #DC2626;">Cred'</span></h1>
        </div>

        <h2 style="color: #1F2937;">Vérification de votre email</h2>

        <p style="color: #374151; line-height: 1.6;">
          Pour finaliser votre inscription sur Politik Cred', veuillez vérifier votre adresse email
          en cliquant sur le bouton ci-dessous :
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}"
             style="background-color: #DC2626; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Vérifier mon email
          </a>
        </div>

        <p style="color: #6B7280; font-size: 14px;">
          Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
          <a href="${verificationLink}" style="color: #1E3A8A; word-break: break-all;">${verificationLink}</a>
        </p>

        <p style="color: #EF4444; font-size: 14px; margin-top: 20px;">
          Ce lien expire dans 24 heures.
        </p>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">

        <p style="color: #6B7280; font-size: 14px; text-align: center;">
          Politik Cred' - Pour une démocratie plus transparente
        </p>
      </div>
    `,
    textContent: `
      Vérification de votre email - Politik Cred'

      Pour finaliser votre inscription sur Politik Cred', veuillez vérifier votre adresse email en visitant ce lien :

      ${verificationLink}

      Ce lien expire dans 24 heures.

      Politik Cred' - Pour une démocratie plus transparente
    `
  }
}

/**
 * Password reset template
 */
export function getPasswordResetTemplate(resetLink: string): EmailTemplate {
  return {
    subject: 'Réinitialisation de votre mot de passe - Politik Cred\'',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1E3A8A;">Politik<span style="color: #DC2626;">Cred'</span></h1>
        </div>

        <h2 style="color: #1F2937;">Réinitialisation de mot de passe</h2>

        <p style="color: #374151; line-height: 1.6;">
          Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton
          ci-dessous pour créer un nouveau mot de passe :
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}"
             style="background-color: #DC2626; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Réinitialiser mon mot de passe
          </a>
        </div>

        <p style="color: #6B7280; font-size: 14px;">
          Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
          <a href="${resetLink}" style="color: #1E3A8A; word-break: break-all;">${resetLink}</a>
        </p>

        <div style="background-color: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="color: #DC2626; margin: 0; font-size: 14px;">
            <strong>Sécurité :</strong> Si vous n'avez pas demandé cette réinitialisation,
            ignorez cet email. Votre mot de passe actuel reste inchangé.
          </p>
        </div>

        <p style="color: #EF4444; font-size: 14px;">
          Ce lien expire dans 1 heure.
        </p>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">

        <p style="color: #6B7280; font-size: 14px; text-align: center;">
          Politik Cred' - Pour une démocratie plus transparente
        </p>
      </div>
    `,
    textContent: `
      Réinitialisation de mot de passe - Politik Cred'

      Vous avez demandé la réinitialisation de votre mot de passe. Visitez ce lien pour créer un nouveau mot de passe :

      ${resetLink}

      SÉCURITÉ : Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste inchangé.

      Ce lien expire dans 1 heure.

      Politik Cred' - Pour une démocratie plus transparente
    `
  }
}

/**
 * Vote notification template
 */
export function getVoteNotificationTemplate(politicianName: string, voteType: 'positive' | 'negative' | 'rectification'): EmailTemplate {
  const voteTypeLabel = {
    positive: 'positif',
    negative: 'négatif',
    rectification: 'de rectification'
  }[voteType]

  return {
    subject: `Nouveau vote ${voteTypeLabel} pour ${politicianName}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1E3A8A;">Politik<span style="color: #DC2626;">Cred'</span></h1>
        </div>

        <h2 style="color: #1F2937;">Nouveau vote signalé</h2>

        <p style="color: #374151; line-height: 1.6;">
          Un nouveau vote <strong>${voteTypeLabel}</strong> a été signalé concernant
          <strong>${politicianName}</strong>.
        </p>

        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #374151; margin: 0;">
            Ce vote est actuellement en attente de validation par notre commission de modération.
            Vous recevrez une notification une fois le processus de vérification terminé.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://politik-cred.fr/politician/${encodeURIComponent(politicianName.toLowerCase())}"
             style="background-color: #1E3A8A; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Voir le profil
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">

        <p style="color: #6B7280; font-size: 14px; text-align: center;">
          Politik Cred' - Pour une démocratie plus transparente
        </p>
      </div>
    `,
    textContent: `
      Nouveau vote signalé - Politik Cred'

      Un nouveau vote ${voteTypeLabel} a été signalé concernant ${politicianName}.

      Ce vote est actuellement en attente de validation par notre commission de modération.
      Vous recevrez une notification une fois le processus de vérification terminé.

      Voir le profil : https://politik-cred.fr/politician/${encodeURIComponent(politicianName.toLowerCase())}

      Politik Cred' - Pour une démocratie plus transparente
    `
  }
}

/**
 * Newsletter template
 */
export function getNewsletterTemplate(title: string, content: string): EmailTemplate {
  return {
    subject: `Newsletter Politik Cred' - ${title}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1E3A8A;">Politik<span style="color: #DC2626;">Cred'</span></h1>
          <p style="color: #6B7280;">Newsletter</p>
        </div>

        <h2 style="color: #1F2937;">${title}</h2>

        <div style="color: #374151; line-height: 1.6;">
          ${content}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://politik-cred.fr"
             style="background-color: #1E3A8A; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Visiter la plateforme
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">

        <p style="color: #6B7280; font-size: 12px; text-align: center;">
          Vous recevez cet email car vous êtes inscrit à la newsletter Politik Cred'.<br>
          <a href="https://politik-cred.fr/unsubscribe" style="color: #6B7280;">Se désabonner</a>
        </p>
      </div>
    `,
    textContent: `
      Newsletter Politik Cred' - ${title}

      ${content.replace(/<[^>]*>/g, '')}

      Visiter la plateforme : https://politik-cred.fr

      Vous recevez cet email car vous êtes inscrit à la newsletter Politik Cred'.
      Se désabonner : https://politik-cred.fr/unsubscribe
    `
  }
}