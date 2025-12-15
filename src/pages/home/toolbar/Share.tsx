import { useFetch, useRouter, useT, useUtil } from "~/hooks"
import {
  bus,
  getExpireDate,
  handleResp,
  makeTemplateData,
  matchTemplate,
  r,
  randomPwd,
} from "~/utils"
import { batch, createSignal, Match, onCleanup, Switch } from "solid-js"
import {
  Button,
  createDisclosure,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  Textarea,
  VStack,
} from "@hope-ui/solid"
import {
  ExtractFolder,
  PResp,
  Share as ShareType,
  ShareInfo,
} from "~/types"
import { createStore } from "solid-js/store"
import { getSetting, me, selectedObjs } from "~/store"
import { TbRefresh } from "solid-icons/tb"
import { SelectOptions } from "~/components"

export const Share = () => {
  const t = useT()
  const { pathname } = useRouter()
  const { copy } = useUtil()

  const [link, setLink] = createSignal("")
  const [expireSelect, setExpireSelect] = createSignal("2d") // ✅ 默认 2 天

  const { isOpen, onOpen, onClose } = createDisclosure()

  const [share, setShare] = createStore<ShareType>({} as ShareType)

  /**
   * ✅ 右键 / 工具栏分享统一入口
   * ❗ 不判断 name，避免事件不匹配导致弹窗打不开
   */
  const handler = () => {
    batch(() => {
      setLink("")
      setExpireSelect("2d")

      const paths = selectedObjs().map((obj) => {
        const split =
          pathname().endsWith("/") || obj.name.startsWith("/") ? "" : "/"
        return `${me().base_path}${pathname()}${split}${obj.name}`
      })

      setShare({
        files: paths,
        expires: getExpireDate("2d").toISOString(), // ✅ 默认 2 天
        pwd: randomPwd(), // ✅ 默认随机密码
        max_accessed: 0,
        extract_folder: ExtractFolder.Front,
        readme: "",
        header: "",
      } as ShareType)
    })

    onOpen()
  }

  bus.on("tool", handler)
  onCleanup(() => bus.off("tool", handler))

  const [okLoading, ok] = useFetch((): PResp<ShareInfo> => {
    return r.post(`/share/create`, share)
  })

  return (
    <Modal
      blockScrollOnMount={false}
      opened={isOpen()}
      onClose={onClose}
      size={{
        "@initial": "xs",
        "@md": "md",
        "@lg": "lg",
        "@xl": "xl",
        "@2xl": "2xl",
      }}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t("home.toolbar.share")}</ModalHeader>

        <Switch
          fallback={
            <>
              <ModalBody>
                <Textarea variant="filled" value={link()} readonly />
              </ModalBody>
              <ModalFooter display="flex" gap="$2">
                <Button
                  colorScheme="primary"
                  onClick={() => copy(link())}
                >
                  {t("shares.copy_msg")}
                </Button>
                <Button colorScheme="info" onClick={onClose}>
                  {t("global.confirm")}
                </Button>
              </ModalFooter>
            </>
          }
        >
          <Match when={link() === ""}>
            <ModalBody>
              <VStack spacing="$1" alignItems="flex-start">
                {/* 解压目录 */}
                <Text size="sm">{t("shares.extract_folder")}</Text>
                <Select
                  size="sm"
                  value={share.extract_folder}
                  onChange={(e) => setShare("extract_folder", e)}
                >
                  <SelectOptions
                    options={[
                      { key: ExtractFolder.Front, label: "前置解压" },
                      { key: ExtractFolder.Back, label: "后置解压" },
                    ]}
                  />
                </Select>

                {/* 密码 */}
                <Text size="sm">{t("shares.pwd")}</Text>
                <HStack spacing="$1" w="$full">
                  <Input
                    size="sm"
                    value={share.pwd}
                    onInput={(e) =>
                      setShare("pwd", e.currentTarget.value)
                    }
                  />
                  <IconButton
                    size="sm"
                    aria-label="random"
                    icon={<TbRefresh />}
                    onClick={() => setShare("pwd", randomPwd())}
                  />
                </HStack>

                {/* 最大访问次数 */}
                <Text size="sm">{t("shares.max_accessed")}</Text>
                <Input
                  type="number"
                  size="sm"
                  value={share.max_accessed}
                  onInput={(e) =>
                    setShare(
                      "max_accessed",
                      parseInt(e.currentTarget.value),
                    )
                  }
                />

                {/* 过期时间（下拉） */}
                <Text size="sm">{t("shares.expires")}</Text>
                <Select
                  size="sm"
                  value={expireSelect()}
                  onChange={(v) => {
                    setExpireSelect(v as string)
                    if (v === "never") {
                      setShare("expires", null)
                    } else {
                      setShare(
                        "expires",
                        getExpireDate(v as string).toISOString(),
                      )
                    }
                  }}
                >
                  <SelectOptions
                    options={[
                      { key: "2h", label: "2 小时" },
                      { key: "2d", label: "2 天" },
                      { key: "1w", label: "1 周" },
                      { key: "1M", label: "1 月" },
                      { key: "never", label: "永不过期" },
                    ]}
                  />
                </Select>

                {/* 头部说明 */}
                <Text size="sm">{t("shares.header")}</Text>
                <Textarea
                  size="sm"
                  value={share.header}
                  onInput={(e) =>
                    setShare("header", e.currentTarget.value)
                  }
                />
              </VStack>
            </ModalBody>

            <ModalFooter display="flex" gap="$2">
              <Button colorScheme="neutral" onClick={onClose}>
                {t("global.cancel")}
              </Button>
              <Button
                colorScheme="info"
                loading={okLoading()}
                onClick={async () => {
                  const resp = await ok()
                  handleResp(resp, (data) => {
                    const msg = matchTemplate(
                      getSetting("share_summary_content"),
                      makeTemplateData(data, {
                        site_title: getSetting("site_title"),
                      }),
                    )
                    setLink(msg)
                  })
                }}
              >
                {t("global.confirm")}
              </Button>
            </ModalFooter>
          </Match>
        </Switch>
      </ModalContent>
    </Modal>
  )
}
