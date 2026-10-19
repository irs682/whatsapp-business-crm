const tagRepository = require('./tag.repository');
const { ConflictError, NotFoundError } = require('../../errors');

class TagService {
  async listTags(query = {}) {
    const where = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    return tagRepository.findAll({ where });
  }

  async getTagById(id) {
    const tag = await tagRepository.findById(id);
    if (!tag) {
      throw new NotFoundError('Tag not found');
    }
    return tag;
  }

  async createTag(data) {
    const existing = await tagRepository.findByName(data.name);
    if (existing) {
      throw new ConflictError('A tag with this name already exists');
    }
    return tagRepository.create(data);
  }

  async updateTag(id, data) {
    await this.getTagById(id);
    if (data.name) {
      const existing = await tagRepository.findByName(data.name);
      if (existing && existing.id !== id) {
        throw new ConflictError('A tag with this name already exists');
      }
    }
    return tagRepository.update(id, data);
  }

  async deleteTag(id) {
    await this.getTagById(id);
    await tagRepository.delete(id);
    return { id, deleted: true };
  }
}

module.exports = new TagService();
