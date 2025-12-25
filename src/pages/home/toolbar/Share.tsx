import { useFetch, useRouter, useT, useUtil } from "~/hooks"
import {
  bus,
  handleResp,
  makeTemplateData,
  matchTemplate,
  r,
  randomPwd,
  getExpireDate, // 保留此引用以确保逻辑兼容
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
  OrderBy,
  OrderDirection,
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
  const [link, setLink] = createSignal("")
  const { pathname } = useRouter()

  // 1. 定义过期时间选项，直接使用原始代码支持的字符串格式
  const expireOptions = [
    { label: "1天", value: "+1d" },
    { label: "2天", value: "+2d" },
    { label: "一周", value: "+1w" },
    { label: "一月", value: "+30d" },
  ]

  const handler = (name: string) => {
    if (name === "share") {
      batch(() => {
        setLink("")
        const paths = selectedObjs().map((obj) => {
          const split =
            pathname().endsWith("/") || obj.name.startsWith("/") ? "" : "/"
          return `${me().base_path}${pathname()}${split}${obj.name}`
        })
        
        // 2. 初始化时默认设置为字符串 "+1d"
        setShare({
          files: paths,
          expires: "+1d", // 默认选项
          pwd: "",
          max_accessed: 0,
          order_by: OrderBy.None,
          order_direction: OrderDirection.None,
          extract_folder: ExtractFolder.None,
          remark: "",
          readme: "",
          header: "",
        } as ShareType)
      })
      onOpen()
    }
  }

  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })

  const { isOpen, onOpen, onClose } = createDisclosure()
  const { copy } = useUtil()
  const [share, setShare] = createStore<ShareType>({} as ShareType)
  const [okLoading, ok] = useFetch((): PResp<ShareInfo> => {
    // 发送请求前，如果 expires 是字符串格式（如 +1d），后端会自行处理或在 utils 中转换
    // 此处直接提交 store 里的数据
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
      }}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t("home.toolbar.share")}</ModalHeader>
        <Switch
          fallback={
            <>
              <ModalBody>
                <Textarea variant="filled" value={link()} readonly rows={4} />
              </ModalBody>
              <ModalFooter display="flex" gap="$2">
                <Button
                  w="$full"
                  colorScheme="primary"
                  onClick={() => {
                    copy(link())
                    onClose()
                  }}
                >
                  复制后关闭
                </Button>
              </ModalFooter>
            </>
          }
        >
          <Match when={link() === ""}>
            <ModalBody>
              <VStack spacing="$3" alignItems="stretch">
                {/* 分享码行 */}
                <HStack spacing="$2" w="$full">
                  <Text size="sm" whiteSpace="nowrap" minW="100px">{t("shares.pwd")}:</Text>
                  <Input
                    size="sm"
                    value={share.pwd}
                    onInput={(e) => setShare("pwd", e.currentTarget.value)}
                  />
                  <IconButton
                    colorScheme="neutral"
                    size="sm"
                    aria-label="random"
                    icon={<TbRefresh />}
                    onClick={() => setShare("pwd", randomPwd())}
                  />
                </HStack>

                {/* 最大访问次数行 */}
                <HStack spacing="$2" w="$full">
                  <Text size="sm" whiteSpace="nowrap" minW="100px">{t("shares.max_accessed")}:</Text>
                  <Input
                    type="number"
                    size="sm"
                    value={share.max_accessed}
                    onInput={(e) => setShare("max_accessed", parseInt(e.currentTarget.value))}
                  />
                </HStack>

                {/* 3. 过期时间下拉菜单行，使用字符串逻辑 */}
                <HStack spacing="$2" w="$full">
                  <Text size="sm" whiteSpace="nowrap" minW="100px">{t("shares.expires")}:</Text>
                  <Select
                    size="sm"
                    value={share.expires} // 绑定 store 中的字符串值
                    onChange={(val: string) => {
                      setShare("expires", val)
                    }}
                  >
                    <SelectOptions
                      options={expireOptions.map(opt => ({
                        key: opt.value,
                        label: opt.label
                      }))}
                    />
                  </Select>
                </HStack>

                {/* 说明/备注区域 */}
                <VStack spacing="$1" alignItems="flex-start">
                  <Text size="sm">{t("shares.readme")}:</Text>
                  <Textarea
                    size="sm"
                    value={share.readme}
                    onInput={(e) => setShare("readme", e.currentTarget.value)}
                  />
                </VStack>
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
                  // 在提交前，如果需要将 +1d 转换为 ISO 格式，可以调用原有的 getExpireDate
                  const finalShare = { ...share };
                  if (typeof finalShare.expires === "string" && finalShare.expires.startsWith("+")) {
                    finalShare.expires = getExpireDate(finalShare.expires).toISOString();
                  }

                  const resp = await r.post(`/share/create`, finalShare);
                  handleResp(resp, (data) => {
                    const templateData = makeTemplateData(data, {
                      site_title: getSetting("site_title"),
                    })
                    const msg = matchTemplate(
                      getSetting("share_summary_content"),
                      templateData,
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
