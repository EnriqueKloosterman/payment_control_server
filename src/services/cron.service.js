const cron = require('node-cron');
const { Op } = require('sequelize');
const { Factura, User } = require('../models');
const logger = require('../config/logger');
const emailService = require('./email.service');

class CronService {
  constructor() {
    this.jobs = [];
  }

  /**
   * Initialize all cron jobs
   */
  start() {
    logger.info('Initializing Cron Jobs...');
    
    // Check for overdue invoices every day at midnight
    // Production: '0 0 * * *' (Every day at midnight)
    const overdueJob = cron.schedule('0 0 * * *', async () => {
      logger.info('Running cron job: Check for overdue invoices...');
      try {
        await this.checkOverdueInvoices();
      } catch (error) {
        logger.error(`Cron Job Error: ${error.message}`);
      }
    });

    this.jobs.push(overdueJob);

    // Notify about invoices due today every day at 08:00 AM
    const dueTodayJob = cron.schedule('0 8 * * *', async () => {
      logger.info('Running cron job: Check for invoices due today...');
      try {
        await this.checkDueTodayInvoices();
      } catch (error) {
        logger.error(`Cron Job Error: ${error.message}`);
      }
    });

    this.jobs.push(dueTodayJob);

    logger.info('Cron Jobs started successfully.');
  }

  /**
   * Check and update the status of overdue invoices
   */
  async checkOverdueInvoices() {
    // Get today's date at 00:00:00 to compare strictly before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [updatedCount] = await Factura.update(
      { status: 'vencida' },
      {
        where: {
          status: 'pendiente',
          fecha_de_vencimiento: {
            [Op.lt]: today // Strictly less than today
          }
        }
      }
    );

    if (updatedCount > 0) {
      logger.info(`Cron Job: Successfully marked ${updatedCount} invoices as OVERDUE (vencida).`);
    } else {
      logger.info('Cron Job: No new overdue invoices found.');
    }
  }

  /**
   * Check and notify about invoices due exactly today
   */
  async checkDueTodayInvoices() {
    // Get start and end of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    try {
      // Find all invoices that are pending AND their due date is exactly within today
      const invoicesDueToday = await Factura.findAll({
        where: {
          status: 'pendiente',
          fecha_de_vencimiento: {
            [Op.gte]: startOfToday,
            [Op.lte]: endOfToday
          }
        },
        include: [{ model: User, attributes: ['email', 'firstName'] }]
      });

      if (invoicesDueToday.length > 0) {
        logger.info(`Cron Job: Found ${invoicesDueToday.length} invoices due today. Sending automated emails...`);
        for (const invoice of invoicesDueToday) {
          // Send simulation email
          const userEmail = invoice.User?.email;
          if (userEmail) {
            await emailService.sendInvoiceDueTodayEmail(userEmail, invoice);
          }
        }
      } else {
        logger.info('Cron Job: No pending invoices due today. No emails sent.');
      }
    } catch (error) {
      logger.error(`Cron Job Check Due Today Error: ${error.message}`);
    }
  }

  /**
   * Stop all running cron jobs
   */
  stop() {
    this.jobs.forEach(job => job.stop());
    logger.info('All Cron Jobs stopped.');
  }
}

module.exports = new CronService();
