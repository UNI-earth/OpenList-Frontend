import fs from "fs"
import path from "path"

import en from "./lang/en/entry";
import zhCN from "./lang/zh-CN/entry";

const langs = {
  en,
  "zh-CN": zhCN,
};

// 默认语言：如果有 zh-CN 就用 zh-CN，否则用 en
export const defaultLang = langs["zh-CN"] ? "zh-CN" : "en";

export const getLang = (code: string) => {
  return langs[code] || langs[defaultLang];
};
