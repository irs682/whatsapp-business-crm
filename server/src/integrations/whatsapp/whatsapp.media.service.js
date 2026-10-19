const whatsAppClient = require('./whatsapp.client');
const WHATSAPP_CONSTANTS = require('./whatsapp.constants');
const { WhatsAppMediaValidationError, WhatsAppError } = require('./whatsapp.errors');
const logger = require('../../utils/logger');

/**
 * WhatsApp Media Handling Service
 * Manages media metadata retrieval, size/MIME validation, and secure downloads
 */
class WhatsAppMediaService {
  /**
   * Validate media payload against Meta Cloud API limits
   */
  validateMediaConstraints(mediaType, mimeType, sizeBytes) {
    const typeKey = mediaType.toUpperCase();
    const constraint = WHATSAPP_CONSTANTS.MEDIA_CONSTRAINTS[typeKey];

    if (!constraint) {
      throw new WhatsAppMediaValidationError(`Unsupported media type: ${mediaType}`);
    }

    if (sizeBytes && sizeBytes > constraint.MAX_BYTES) {
      const maxMb = Math.round(constraint.MAX_BYTES / (1024 * 1024));
      throw new WhatsAppMediaValidationError(
        `File size (${Math.round(sizeBytes / (1024 * 1024))}MB) exceeds the maximum allowed limit of ${maxMb}MB for ${mediaType}`
      );
    }

    if (mimeType && !constraint.MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new WhatsAppMediaValidationError(
        `MIME type "${mimeType}" is not supported by Meta for ${mediaType}. Allowed: ${constraint.MIME_TYPES.join(', ')}`
      );
    }

    return true;
  }

  /**
   * Resolve media metadata from Meta Cloud API
   */
  async getMediaDetails(mediaId) {
    if (!mediaId) {
      throw new WhatsAppError('Media ID is required', 400, 'BAD_REQUEST');
    }

    try {
      const metadata = await whatsAppClient.getMediaMetadata(mediaId);
      return metadata;
    } catch (error) {
      logger.error(`[WhatsAppMedia] Failed to retrieve media metadata for ${mediaId}:`, error.message);
      throw error;
    }
  }
}

module.exports = new WhatsAppMediaService();
