const notificationRepository = require('./notification.repository');

class NotificationService {
  async list(query = {}) {
    // TODO: Follow SRS/Proposal specifications for notifications business logic
    return {
      items: await notificationRepository.findAll(),
      message: 'Module notifications placeholder response - scheduled for Phase roadmap',
    };
  }
}

module.exports = new NotificationService();
