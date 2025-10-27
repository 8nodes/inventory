const Shop = require('../models/Shop');
const ShopProduct = require('../models/ShopProduct');
const { publishEvent } = require('../config/rabbitmq');
const logger = require('../utils/logger');

exports.createShop = async (req, res, next) => {
  try {
    const shopData = {
      ...req.body,
      ownerId: req.user.userId,
      companyId: req.body.companyId || req.user.companyId,
    };

    const slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    shopData.slug = slug;

    const existingShop = await Shop.findOne({ slug });
    if (existingShop) {
      shopData.slug = `${slug}-${Date.now()}`;
    }

    const shop = await Shop.create(shopData);

    await publishEvent('shop.created', {
      shopId: shop._id,
      companyId: shop.companyId,
      ownerId: shop.ownerId,
      name: shop.name,
      timestamp: new Date(),
    });

    logger.info(`Shop created: ${shop._id}`);
    res.status(201).json({ success: true, data: shop });
  } catch (error) {
    logger.error(`Create shop error: ${error.message}`);
    next(error);
  }
};

exports.getShops = async (req, res, next) => {
  try {
    const { status, type, companyId, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (companyId) query.companyId = companyId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    const shops = await Shop.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Shop.countDocuments(query);

    res.json({
      success: true,
      data: shops,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    logger.error(`Get shops error: ${error.message}`);
    next(error);
  }
};

exports.getShopById = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    res.json({ success: true, data: shop });
  } catch (error) {
    logger.error(`Get shop error: ${error.message}`);
    next(error);
  }
};

exports.getShopBySlug = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ slug: req.params.slug });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    res.json({ success: true, data: shop });
  } catch (error) {
    logger.error(`Get shop by slug error: ${error.message}`);
    next(error);
  }
};

exports.updateShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const updatedShop = await Shop.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    await publishEvent('shop.updated', {
      shopId: updatedShop._id,
      changes: req.body,
      timestamp: new Date(),
    });

    logger.info(`Shop updated: ${updatedShop._id}`);
    res.json({ success: true, data: updatedShop });
  } catch (error) {
    logger.error(`Update shop error: ${error.message}`);
    next(error);
  }
};

exports.deleteShop = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    await Shop.findByIdAndDelete(req.params.id);

    await publishEvent('shop.deleted', {
      shopId: shop._id,
      timestamp: new Date(),
    });

    logger.info(`Shop deleted: ${shop._id}`);
    res.json({ success: true, message: 'Shop deleted successfully' });
  } catch (error) {
    logger.error(`Delete shop error: ${error.message}`);
    next(error);
  }
};

exports.updateShopStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    await publishEvent('shop.status_changed', {
      shopId: shop._id,
      status,
      timestamp: new Date(),
    });

    res.json({ success: true, data: shop });
  } catch (error) {
    logger.error(`Update shop status error: ${error.message}`);
    next(error);
  }
};

exports.getShopStats = async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const products = await ShopProduct.countDocuments({ shopId: shop._id, status: 'active' });

    const stats = {
      ...shop.metrics,
      activeProducts: products,
      staff: shop.staff.length,
      verified: shop.verification.verified,
      subscriptionPlan: shop.subscription.plan,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error(`Get shop stats error: ${error.message}`);
    next(error);
  }
};

exports.addStaffMember = async (req, res, next) => {
  try {
    const { userId, role, permissions } = req.body;

    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const existingStaff = shop.staff.find(s => s.userId.toString() === userId);
    if (existingStaff) {
      return res.status(400).json({ success: false, message: 'Staff member already exists' });
    }

    shop.staff.push({ userId, role, permissions });
    await shop.save();

    await publishEvent('shop.staff_added', {
      shopId: shop._id,
      userId,
      role,
      timestamp: new Date(),
    });

    res.json({ success: true, data: shop });
  } catch (error) {
    logger.error(`Add staff member error: ${error.message}`);
    next(error);
  }
};

exports.removeStaffMember = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const shop = await Shop.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    shop.staff = shop.staff.filter(s => s.userId.toString() !== userId);
    await shop.save();

    await publishEvent('shop.staff_removed', {
      shopId: shop._id,
      userId,
      timestamp: new Date(),
    });

    res.json({ success: true, data: shop });
  } catch (error) {
    logger.error(`Remove staff member error: ${error.message}`);
    next(error);
  }
};
