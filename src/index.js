import qs from 'qs';
import superagent from 'superagent';
import get from 'lodash/get';

import { getDefaultConfig } from './config';

let globalConfig = getDefaultConfig();

const {
  errCodeWithMsg,
  codeToMessage,
  beforeHookPrefix,
  afterSuccessHookPrefix,
  afterFailedHookPrefix,
  defaultToastPrefix,
} = globalConfig;

class MokaRequest {
  /**
   * Constructor
   *
   * @param {string} url
   * @param {object} options
   * @param {object} options.query
   * @param {function} [options.dispatch] - dispatch function to issue redux action.
   * @param {string} [options.toastPrefix = '操作'] - toast prefix string that will be displayed in toast.
   * @param {boolean} [options.withSuccessToast = false] - whether to show success toast, if it is true then `dispatch` must be provided.
   * @param {boolean} [options.withErrorToast = false] - whether to show error toast, if it is true then `dispatch` must be provided.
   * @param {boolean} [options.withLoadingToast = false] - whether to show loading toast, if it is true then `dispatch` must be provided.
   * @return {MokaRequest} request instance
   */
  constructor(
    url,
    {
      query,
      dispatch,
      toastPrefix = defaultToastPrefix,
      withSuccessToast = false,
      withErrorToast = false,
      withLoadingToast = false,
    } = {}
  ) {
    this.id = Date.now() + '_' + parseInt(Math.random() * 1000);
    this.request = null;
    this.url = url;
    this.query = query;
    this.dispatch = dispatch;
    this.toastPrefix = toastPrefix;
    this.withSuccessToast = withSuccessToast;
    this.withErrorToast = withErrorToast;
    this.withLoadingToast = withLoadingToast;

    this.checkResponse = this.checkResponse.bind(this);
    this.beforeHook = this.beforeHook.bind(this);
    this.afterSuccessHook = this.afterSuccessHook.bind(this);
    this.afterFailedHook = this.afterFailedHook.bind(this);
  }

  static globalOption = {
    headers: [], // 全局header，将注入进http request中，格式为{ key, value }
  };

  /**
   * 全局配置
   *
   * @param {object} options
   * @param {{key:string, value: string}[]} [options.headers] - 自定义header，将会注入进request中
   */
  static setGlobalOption({ headers }) {
    if (headers) {
      MokaRequest.globalOption.headers.push(...headers);
      // 这是为了方便历史遗留的未迁移到mokaRequest也能拿到全局设置
      // 当所有请求都迁移到mokaRequest之后，这个代码就可以废弃了
      window._mokaRequestGlobalOption = window._mokaRequestGlobalOption || {};
      window._mokaRequestGlobalOption.headers = MokaRequest.globalOption.headers;
    }
  }

  /**
   * Format query object to query string.
   * Use 'brackets' format for array type.
   *
   * @private
   * @param {object} query
   * @return {string} queryString
   */
  get queryString() {
    if (!this.query) {
      return this.query;
    } else {
      return qs.stringify(this.query, { arrayFormat: 'brackets' });
    }
  }

  /**
   * Check whether the request is succes or failed
   *
   * @private
   * @param { body: object } res
   * @param {{ code: number, msg: string, data: any }} res.body
   * @return res of params.
   * @throw {Error}
   */
  checkResponse(res) {
    if (res.body.code === 200 || res.body.code === 0) {
      return res;
    } else {
      throw Object.assign(new Error(res.body.msg || 'Failed response code detected.'), {
        response: res,
      });
    }
  }

  /**
   * Hook before request.
   *
   * @private
   */
  beforeHook() {
    if (this.withLoadingToast && this.dispatch) {
      this.dispatch(globalConfig.loadingToast(this.toastPrefix + ' ' + beforeHookPrefix, this.id));
    }

    // 添加当前的 socket.id 到 header，辅助后端直接发到信息当前的 tab
    this.request.use((req) => {
      if (
        /\/api\/(chromoka\/)?upload_resume/i.test(req.url) &&
        window._wsConnection &&
        window._wsConnection.id
      ) {
        req.set('ws-id', window._wsConnection.id);
      }
    });

    // 后端根据这个识别是来自MokaRequest的请求，返回约定的数据格式
    // 这个头部的命名是一个不好的例子，自定义头部应该以x开头，因为后端已经在用了，所以前端只能传这个了
    this.request.set('use-http-status', 0);

    MokaRequest.globalOption.headers.forEach((header) => {
      this.request.set(header.key, header.value);
    });
  }

  /**
   * Hook after request success.
   *
   * @private
   * @param { body: object } res
   * @param {{ code: number, msg: string, data: any }} res.body
   * @return {any} data field of options.
   */
  afterSuccessHook(res) {
    if (this.withSuccessToast && this.dispatch) {
      this.dispatch(globalConfig.successToast(this.toastPrefix + afterSuccessHookPrefix, this.id));
    }

    return res.body.data;
  }

  /**
   * Hook after request failed.
   *
   * @private
   * @param {Error} err
   * @throws err of params.
   */
  afterFailedHook(err) {
    /**
     * 如果是 abort() cancel掉的接口 无需errorToast
     */
    const isAborted = get(err, 'response.req.aborted', false);
    const errCode = err.response && err.response.body && err.response.body.code;
    const defaultErrMsg = err.response && err.response.body && err.response.body.msg;
    let errMsg = '';
    if (errCodeWithMsg.includes(errCode)) {
      errMsg =
        err.response &&
        err.response.body &&
        err.response.body.data &&
        err.response.body.data.locationDesc;
    }
    const reason = codeToMessage(errCode, errMsg, defaultErrMsg);

    // 这是为了方便后端同志调查bug，因为现在所有接口即使报错status也是200，无法从chrome开发者工具里快速发现报错的接口了
    if (!isAborted && err.response) {
      console.error('MokaRequest Error: ', err.response.req.method, err.response.req.url);
    }
    if (this.withErrorToast && this.dispatch && !isAborted) {
      this.dispatch(
        globalConfig.errorToast(this.toastPrefix + ' ' + afterFailedHookPrefix + reason, this.id)
      );
    }

    throw Object.assign(err, { reason });
  }

  /**
   * Send a GET request to the backend.
   *
   * @public
   * @return {Promise<any>} Promise that resolves to data field of response body.
   */
  get() {
    this.request = superagent.get(this.url).query(this.queryString);
    this.beforeHook();
    return new Promise((resolve, reject) => {
      this.request.end((err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    })
      .then(this.checkResponse)
      .then(this.afterSuccessHook, this.afterFailedHook);
  }

  /**
   * Send a PUT request to the backend.
   *
   * @public
   * @param {any} data - data that will be set as request body.
   * @return {Promise<any>} Promise that resolves to data field of response body.
   */
  put(data) {
    this.request = superagent.put(this.url).query(this.queryString).send(data);
    this.beforeHook();
    return new Promise((resolve, reject) => {
      this.request.end((err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    })
      .then(this.checkResponse)
      .then(this.afterSuccessHook, this.afterFailedHook);
  }

  /**
   * Send a POST request to the backend.
   *
   * @public
   * @param {any} data - data that will be set as request body.
   * @return {Promise<any>} Promise that resolves to data field of response body.
   */
  post(data) {
    this.request = superagent.post(this.url).query(this.queryString).send(data);
    this.beforeHook();
    return new Promise((resolve, reject) => {
      this.request.end((err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    })
      .then(this.checkResponse)
      .then(this.afterSuccessHook, this.afterFailedHook);
  }

  /**
   * Send a DELETE request to the backend.
   *
   * @public
   * @param {any} data - data that will be set as request body.
   * @return {Promise<any>} Promise that resolves to data field of response body.
   */
  del(data) {
    this.request = superagent.delete(this.url).query(this.queryString).send(data);
    this.beforeHook();
    return new Promise((resolve, reject) => {
      return this.request.end((err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    })
      .then(this.checkResponse)
      .then(this.afterSuccessHook, this.afterFailedHook);
  }

  /**
   * Send a POST request with FormData to the backend.
   * https://www.jianshu.com/p/1432e0f29abd 详细superagent使用中文文档
   *
   * @public
   * @param {Array<{ field: String, file: Blob | File, option: String|Object }>} option.files
   * field 是 file 对应的字段名 option 可选 参考文档使用
   * @param {Object} option.data 这个由于FormData比较特殊 保留了 FormData原始数据结构 可选
   * example：
   * {
   *  username: 'gapgap',
   *  user[name]: 'gapgap',
   *  user[email]: 'gap@mokahr.com',
   *  users[]: 'gap1',
   *  users[]: 'gap2',
   * }
   * ==> 等价于json数据
   * {
   *  "username": "gapgap",
   *  "user": {
   *    "name": "gapgap",
   *    "email": "gap@mokahr.com",
   *  },
   *  "users": ["gap1", "gap2"]
   * }
   * @param {Function} option.onProcess 监听请求事件 (e) => {}
   * @return {Promise<any>} Promise that resolves to data field of response body.
   */
  attach({ files = [], data = {}, onProcess = () => {} }) {
    this.request = superagent.post(this.url).query(this.queryString).on('progress', onProcess);

    files.forEach(({ field, file, option }) => {
      this.request = this.request.attach(field, file, option);
    });

    Object.entries(data).forEach(([key, value]) => {
      this.request = this.request.field(key, value);
    });

    this.beforeHook();
    return new Promise((resolve, reject) => {
      this.request.end((err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    })
      .then(this.checkResponse)
      .then(this.afterSuccessHook, this.afterFailedHook);
  }

  /**
   * Abort an existing request.
   *
   * @public
   */
  abort() {
    if (this.request) {
      this.request.abort();
    }
  }
}

export { MokaRequest };

export const configure = (config) => {
  globalConfig = { ...globalConfig, ...config };
};

export default (url, options) => new MokaRequest(url, options);
