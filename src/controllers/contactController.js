const { enviarEmailContato, enviarEmailNewsletter } = require("../services/emailService");

async function contato(req, res) {
  const { nome, email, empresa, mensagem } = req.body;

  if (!nome || !email || !empresa || !mensagem) {
    return res.status(400).json({ error: "Dados obrigatorios ausentes" });
  }

  try {
    await enviarEmailContato({ nome, email, empresa, mensagem });
    return res.json({ success: true });
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
}

async function newsletter(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email e obrigatorio" });
  }

  try {
    await enviarEmailNewsletter(email);
    return res.json({ success: true });
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return res.status(500).json({ error: "Erro ao enviar email" });
  }
}

module.exports = { contato, newsletter };
