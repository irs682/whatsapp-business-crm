/**
 * Extracts and sanitizes pagination parameters from query string
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  return {
    page,
    limit,
    skip,
    orderBy: {
      [sortBy]: sortOrder,
    },
  };
};

/**
 * Formats data and total count into paginated metadata
 */
const formatPaginatedResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    items: data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

module.exports = {
  getPagination,
  formatPaginatedResponse,
};
