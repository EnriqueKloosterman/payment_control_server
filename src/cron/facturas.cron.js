const { Op } = require('sequelize');
const { Factura } = require('../models');
const logger = require('../config/logger');

// Run every day at midnight (00:00)
// If node-cron isn't installed/available, we fallback to a daily interval
const checkOverdueInvoices = async () => {
  logger.info('Running cron job: Checking for overdue invoices...');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [updatedCount] = await Factura.update(
      { status: 'vencida' },
      {
        where: {
          status: 'pendiente',
          fecha_de_vencimiento: {
            [Op.lt]: today // Less than today's date
          }
        }
      }
    );

    if (updatedCount > 0) {
      logger.info(`Cron Job Success: Marked ${updatedCount} invoices as 'vencida'.`);
    } else {
      logger.info('Cron Job Success: No overdue invoices found to update.');
    }
  } catch (error) {
    logger.error('Cron Job failed to update overdue invoices: ' + error.message);
  }
};

const initCronJobs = () => {
    logger.info('Initializing cron jobs (Simulated using setInterval for fallback)');
    // Fallback: Run once immediately, then every 24 hours
    checkOverdueInvoices();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(checkOverdueInvoices, TWENTY_FOUR_HOURS);
};

module.exports = { initCronJobs, checkOverdueInvoices };
