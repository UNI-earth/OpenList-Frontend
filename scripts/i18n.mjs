import fs from "fs"
import path from "path"

const root = "./src/lang"
const entry = "entry.ts"
const langs = fs.readdirSync(root)

// 默认语言目录改为 zh-CN
const defaultLang = "zh-CN"

langs
  .filter((lang) => lang !== defaultLang)
  .forEach((lang) => {
    fs.copyFileSync(
      path.join(root, defaultLang, entry),
      path.join(root, lang, entry)
    )
  })
