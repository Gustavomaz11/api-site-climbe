const { mailTransporter } = require("../config/mail");

async function enviarEmailContato({ nome, email, empresa, mensagem }) {
  const fromContato = {
    name: nome || "Site Climbe",
    address: process.env.SMTP_USER,
  };

  await mailTransporter.sendMail({
    from: fromContato,
    to: "contato@climbe.com.br",
    subject: "Novo contato via site",
    replyTo: { name: nome || "Contato do Site", address: email },
    html: `
        <h2>Novo contato recebido</h2>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Empresa:</strong> ${empresa}</p>
        <p><strong>Mensagem:</strong></p>
        <p>${mensagem}</p>
      `,
  });

  await mailTransporter.sendMail({
    from: { name: "Climbe", address: process.env.SMTP_USER },
    to: email,
    subject: "Recebemos sua mensagem",
    html: `
        <p>Ola, ${nome}!</p>
        <p>Recebemos sua mensagem e em breve um representante da <strong>Climbe</strong> fara contato.</p>
        <p>Atenciosamente,<br/>Equipe Climbe</p>
      `,
  });
}

async function enviarEmailNewsletter(email) {
  await mailTransporter.sendMail({
    from: { name: "Site Climbe", address: process.env.SMTP_USER },
    to: "contato@climbe.com.br",
    subject: "Novo cadastro de interesse",
    html: `
        <p>Um novo usuario demonstrou interesse:</p>
        <p><strong>Email:</strong> ${email}</p>
      `,
  });

  await mailTransporter.sendMail({
    from: { name: "Climbe", address: process.env.SMTP_USER },
    to: email,
    subject: "Obrigado pelo seu interesse",
    html: `
        <p>Ola!</p>
        <p>Obrigado por entrar em contato com a <strong>Climbe</strong>.</p>
        <p>Em breve nossa equipe falara com voce.</p>
      `,
  });
}

module.exports = { enviarEmailContato, enviarEmailNewsletter };
