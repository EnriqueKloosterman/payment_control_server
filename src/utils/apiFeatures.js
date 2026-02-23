class ApiFeatures {
  constructor(model, queryString, initialWhere = {}) {
    this.model = model;
    this.queryString = queryString;
    this.queryObj = { where: { ...initialWhere } };
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'order', 'sortBy'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Add remaining query params to where clause
    for (const key in queryObj) {
        this.queryObj.where[key] = queryObj[key];
    }
    return this;
  }

  sort() {
    if (this.queryString.sortBy) {
      const order = this.queryString.order === 'asc' ? 'ASC' : 'DESC';
      this.queryObj.order = [[this.queryString.sortBy, order]];
    } else {
      this.queryObj.order = [['createdAt', 'DESC']];
    }
    return this;
  }

  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 10;
    const offset = (page - 1) * limit;

    this.queryObj.limit = limit;
    this.queryObj.offset = offset;
    
    // Save for response calculation
    this.page = page;
    this.limit = limit;

    return this;
  }

  async execute() {
    const { count, rows } = await this.model.findAndCountAll(this.queryObj);
    return {
      data: rows,
      total: count,
      totalPages: Math.ceil(count / this.limit),
      currentPage: this.page
    };
  }
}

module.exports = ApiFeatures;
