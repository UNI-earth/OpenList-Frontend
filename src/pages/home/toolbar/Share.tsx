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
  OrderBy,
  OrderDirection,
  PResp,
  Share as ShareType,
  ShareInfo,
} from "~/types"
import { createStore } from "solid-js/store"
import { getSetting, me, selectedObjs } from "~/store"
import { TbRefresh } from "solid-icons/tb"
import { SelectOptions, MultiPathInput } from "~/components"

export const Share = () => {
  const t = useT()
  const [link, setLink] = createSignal("")
  const { pathname } = useRouter()
  const handler = (name: string) => {
    if (name === "share") {
      batch(() => {
        setLink("")
        setExpireString("")
        setExpireValid(true)
        const paths = selectedObjs().map((obj) => {
          const split =
            pathname().endsWith("/") || obj.name.startsWith("/") ? "" : "/"
          return `${me().base_path}${pathname()}${split}${obj.name}`
        })
        setShare({
          files: paths,
          expires: getExpireDate("+2H").toISOString(), // 默认 2 小时
          pwd: randomPwd(),
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
  const [expireString, setExpireString] = createSignal("")
  const [expireValid, setExpireValid] = createSignal(true)
  const [share, setShare] = createStore<ShareType>({} as ShareType)
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
                  onClick={() => {
                    copy(link())
                  }}
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
                <Text size="sm">{t("shares.pwd")}</Text>
                <HStack spacing="$1" w="$full">
                  <Input
                    size="sm"
                    value={share.pwd}
                    onInput={(e) => {
                      setShare("pwd", e.currentTarget.value)
                    }}
                  />
                  <IconButton
                    colorScheme="neutral"
                    size="sm"
                    aria-label="random"
                    icon={<TbRefresh />}
                    onClick={() => {
                      setShare("pwd", randomPwd())
                    }}
                  />
                </HStack>
                <Text size="sm">{t("shares.max_accessed")}</Text>
                <Input
                  type="number"
                  size="sm"
                  value={share.max_accessed}
                  onInput={(e) => {
                    setShare("max_accessed", parseInt(e.currentTarget.value))
                  }}
                />
                <Text size="sm">{t("shares.expires")}</Text>
                <Select
                  size="sm"
                  value="2H"
                  onChange={(e) => {
                    const v = e as string
                    if (v === "never") {
                      setShare("expires", null)
                    } else {
                      // 自动补 +，保持原有解析逻辑
                      setShare("expires", getExpireDate("+" + v).toISOString())
                    }
                  }}
                >
                  <SelectOptions
                    options={[
                      { key: "2H", label: "2 小时" },
                      { key: "2d", label: "2 天" },
                      { key: "1w", label: "1 周" },
                      { key: "1M", label: "1 月" },
                      { key: "never", label: "永不过期" },
                    ]}
                  />
                </Select>
                <Text size="sm">{t("shares.readme")}</Text>
                <Textarea
                  size="sm"
                  value={share.readme}
                  onInput={(e) => {
                    setShare("readme", e.currentTarget.value)
                  }}
                />
              </VStack>
            </ModalBody>
            <ModalFooter display="flex" gap="$2">
              <Button colorScheme="neutral" onClick={onClose}>
                {t("global.cancel")}
              </Button>
              <Button
                colorScheme="info"
                disabled={!expireValid()}
                loading={okLoading()}
                onClick={async () => {
                  const resp = await ok()
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
