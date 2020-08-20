# test-moka-request

```javascript
/**
 * A Promise-styled XHR util class powered by superagent ;)
 *
 * Support GET/PUT/POST/DELETE methods.
 * Support loading/success/error toasts. (requires redux toast middleware)
 *
 * The back-end response structure should be:
 *
 * {
 *   code: number, // response status code, not http status code
 *   msg: string, // response status message
 *   data: object // response payload
 * }
 *
 * Reference wiki link: https://wiki.mokahr.com/pages/viewpage.action?pageId=21964235
 *
 * Life cycle:
 *
 *                    +------------+
 *                    | beforeHook |
 *                    +------+-----+
 *                           |
 *                           v
 *                +---------------------+
 *                | get/put/post/delete |
 *                +----------+----------+
 *                           |
 *                           v
 *                   +---------------+
 *          +--------| checkResponse |--------+
 *          |        +---------------+        |
 *          |                                 |
 *          | success                         | failed
 *          v                                 v
 * +------------------+              +-----------------+
 * | afterSuccessHook |              | afterFailedHook |
 * +--------+---------+              +--------+--------+
 *          | (resolve data)                  | (throw err)
 *          v                                 v
 *       +------+                         +-------+
 *       | then | (your logic)            | catch | (your logic)
 *       +------+                         +-------+
 *
 */

// config
import { configure } from 'moka-request-alpha';
import { loadingToast, successToast, errorToast } from './actions/toasts';
import { codeToMessage, errCodeWithMsg } from '../common/errorCode';
import { getI18n } from '../common/i18n';

const i18n = getI18n();
configure({
  loadingToast,
  successToast,
  errorToast,
  codeToMessage,
  errCodeWithMsg,
  beforeHookPrefix: i18n.t`中...`,
  afterSuccessHookPrefix: i18n.t`成功`,
  afterFailedHookPrefix: i18n.t`失败` + i18n.t`：`,
  defaultToastPrefix: i18n.t`操作`,
});
```
