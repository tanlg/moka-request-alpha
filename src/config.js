export const getDefaultConfig = () => {
  const config = {
    loadingToast: () => {},
    successToast: () => {},
    errorToast: () => {},
    codeToMessage: () => {},
    errCodeWithMsg: [],
    beforeHookPrefix: '', // i18n.t`中...`
    afterSuccessHookPrefix: '', // i18n.t`成功`
    afterFailedHookPrefix: '', // i18n.t`失败` + i18n.t`：`
    defaultToastPrefix: '', // i18n.t`操作`
  };

  return config;
};
