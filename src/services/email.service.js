const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    // For Option 3: Simulation/Log mode, or you can configure Mailtrap here.
    // Using a simple JSON stream transport that just logs to console, or you can configure a real SMTP later.
    
    this.transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows',
      logger: false // we will use our own logger
    });
    
    // Example for real SMTP (uncomment and configure when going to production):
    /*
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: process.env.SMTP_PORT || 2525,
      auth: {
        user: process.env.SMTP_USER || 'your_user',
        pass: process.env.SMTP_PASS || 'your_password'
      }
    });
    */
  }

  async sendInvoiceDueTodayEmail(userEmail, invoiceDetails) {
    try {
      const mailOptions = {
        from: '"Payment Control System" <no-reply@paymentcontrol.com>',
        to: userEmail,
        subject: `⚠️ Aviso de Vencimiento: Factura ${invoiceDetails.factura}`,
        text: `Hola,\n\nTe recordamos que la factura ${invoiceDetails.factura} por un monto de $${invoiceDetails.total} vence el día de hoy.\n\nPor favor, actualiza el estado del pago a la brevedad.\n\nSaludos,\nEl equipo de Payment Control.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #f87171; padding: 20px; text-align: center; color: white;">
              <h2 style="margin: 0;">Aviso de Vencimiento de Factura</h2>
            </div>
            <div style="padding: 20px;">
              <p>Hola,</p>
              <p>Te recordamos que la factura <strong>${invoiceDetails.factura}</strong> por un monto de <strong>$${invoiceDetails.total}</strong> vence el día de <strong>hoy</strong>.</p>
              <p>Por favor, revisa el sistema y actualiza el estado del pago a la brevedad para evitar que sea marcada como vencida a la medianoche.</p>
              <p>Saludos,<br>El equipo de Payment Control.</p>
            </div>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      // If we are using streamTransport, info.message is a Buffer with the raw email.
      // We will just log success visually to the backend console.
      logger.info(`📧 EMAIL SIMULADO ENVIADO a ${userEmail} | Asunto: ${mailOptions.subject}`);
      
      return true;
    } catch (error) {
      logger.error(`Error sending email to ${userEmail}: ${error.message}`);
      return false;
    }
  }
}

module.exports = new EmailService();
