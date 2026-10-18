/**
 * Standard API Response Builder
 */
class ApiResponse {
  static success(res, message = 'Success', data = {}, statusCode = 200, meta = null) {
    const payload = {
      success: true,
      message,
      data,
    };

    if (meta) {
      payload.meta = meta;
    }

    return res.status(statusCode).json(payload);
  }

  static created(res, message = 'Created successfully', data = {}) {
    return this.success(res, message, data, 201);
  }

  static noContent(res) {
    return res.status(204).send();
  }
}

module.exports = ApiResponse;
