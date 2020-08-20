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
```
