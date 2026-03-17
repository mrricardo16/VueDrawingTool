/**
 * 地图数据API模块
 * 提供与地图相关的所有API接口
 */
import request from "../utils/request.js";

/**
 * 地图API接口集合
 * 包含地图文件管理、地图数据操作、站点路径管理等接口
 */
const MapAPI = {
  /**
   * 获取地图文件列表
   * @returns {Promise<Array>} 地图文件列表
   */
  GetMapFileList() {
    return request({
      url: `/info/GetMapFileList`,
      method: "get",
    });
  },

  /**
   * 获取指定地图文件
   * @param {string|number} fileid - 文件ID
   * @returns {Promise<Object>} 地图文件数据
   */
  GetMapFile(fileid) {
    if (!fileid) {
      return Promise.reject(new Error('文件ID不能为空'))
    }
    
    return request({
      url: "/info/GetMapFile",
      method: "get",
      params: { fileid },
    });
  },

  /**
   * 获取当前地图数据
   * @returns {Promise<Object>} 地图数据
   */
  GetMap() {
    return request({
      url: "/MapHis/GetMap",
      method: "get",
    });
  },

  /**
   * 添加地图数据
   * @param {Object} data - 地图数据
   * @returns {Promise<Object>} 添加结果
   */
  AddMapData(data) {
    if (!data || typeof data !== 'object') {
      return Promise.reject(new Error('地图数据不能为空'))
    }
    
    return request({
      url: "/Map/AddMapData",
      method: "post",
      data: data,
    });
  },

  /**
   * 发布地图数据
   * @param {Object} data - 要发布的地图数据
   * @returns {Promise<Object>} 发布结果
   */
  PublishMapData(data) {
    if (!data || typeof data !== 'object') {
      return Promise.reject(new Error('地图数据不能为空'))
    }
    
    return request({
      url: "/Map/PublishMapData",
      method: "post",
      data: data,
    });
  },

  /**
   * 更新路径信息
   * @param {Object} data - 路径数据
   * @returns {Promise<Object>} 更新结果
   */
  UpdatePath(data) {
    if (!data || typeof data !== 'object') {
      return Promise.reject(new Error('路径数据不能为空'))
    }
    
    return request({
      url: "/Map/UpdatePath",
      method: "post",
      data: data,
    });
  },

  /**
   * 更新站点信息
   * @param {Object} data - 站点数据
   * @returns {Promise<Object>} 更新结果
   */
  UpdateSite(data) {
    if (!data || typeof data !== 'object') {
      return Promise.reject(new Error('站点数据不能为空'))
    }
    
    return request({
      url: "/map/UpdateSite",
      method: "post",
      data: data,
    });
  },

  /**
   * 保存地图数据到后端（_RobotProjectModel 格式）
   * 对应客户端 POST /MapHis/SaveMapData
   * @param {Object} data - _RobotProjectModel 格式的地图数据
   * @returns {Promise<Object>} 保存结果
   */
  SaveMapData(data) {
    if (!data || typeof data !== 'object') {
      return Promise.reject(new Error('地图数据不能为空'))
    }
    return request({
      url: '/MapHis/SaveMapData',
      method: 'post',
      data: data,
    })
  },

  /**
   * 从后端读取当前地图数据（_RobotProjectModel 格式）
   * 对应后端 POST /MapHis/GetMapData
   * 注意：result.data 是序列化的 JSON 字符串，需二次解析
   * @returns {Promise<Object>} _RobotProjectModel 对象
   */
  GetMapData() {
    return request({
      url: '/MapHis/GetMapData',
      method: 'post',
      data: {},
    })
  },

  /**
   * 根据站点ID获取相关路径
   * @param {string|number} siteId - 站点ID
   * @returns {Promise<Array>} 路径列表
   */
  GetPathBySiteId(siteId) {
    if (!siteId) {
      return Promise.reject(new Error('站点ID不能为空'))
    }
    
    return request({
      url: "/Map/GetPathBySiteId",
      method: "get",
      params: { siteId },
    });
  },

  /**
   * 检查站点是否存在
   * @param {string|number} siteId - 站点ID
   * @returns {Promise<boolean>} 是否存在
   */
  SiteIsExist(siteId) {
    if (!siteId) {
      return Promise.reject(new Error('站点ID不能为空'))
    }
    
    return request({
      url: "/Map/SiteIsExist",
      method: "get",
      params: { siteId },
    });
  },
};

export default MapAPI;
