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

  // ✅ 过期时间下拉框状态（默认 2 天）
  const [expireSelect, setExpireSelect] = createSignal("2d")

  const [share, setShare] = createStore<ShareType>({} as ShareType)

  const handler = (name: string) => {
    if (name === "share") {
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

          // ✅ 默认 2 天过期
          expires: getExpireDate("2d").toISOString(),

          // ✅ 默认随机密码
          pwd: randomPwd(),

          max_accessed: 0,

          // ✅ 避免 Select 初始值不匹配
          extract_folder: ExtractFolder.Front,

          readme: "",
          header: "",
        } as ShareType)
      })

      onOpen()
    }
  }

  bus.on("tool", handler)
  onCleanup(() => bus.off("tool", handler))

  const { isOpen, onOpen, onClose } = createDisclosure()

  const [okLoading, ok] = useFetch((): PResp<ShareInfo> => {
    return r.post(`/share/create`, share)
  })

  return (
    <Modal opened={isOpen()} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{t("home.toolbar.share")}</ModalHeader>

        <Switch
          fallback={
            <>
              <ModalBody>
                <Textarea variant="filled" value={link()} readonly />
              </ModalBody>
              <ModalFooter gap="$2">
                <Button colorScheme="primary" onClick={() => copy(link())}>
                  {t("shares.copy_msg")}
                </Button>
                <Button onClick={onClose}>{t("global.confirm")}</Button>
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
                      {
                        key: ExtractFolder.Front,
                        label: t("shares.extract_folders.front"),
                      },
                      {
                        key: ExtractFolder.Back,
                        label: t("shares.extract_folders.back"),
                      },
                    ]}
                  />
                </Select>

                {/* 密码 */}
                <Text size="sm">{t("shares.pwd")}</Text>
                <HStack w="$full">
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
                  size="sm"
                  type="number"
                  value={share.max_accessed}
                  onInput={(e) =>
                    setShare(
                      "max_accessed",
                      parseInt(e.currentTarget.value) || 0,
                    )
                  }
                />

                {/* 过期时间 */}
                <Text size="sm">{t("shares.expires")}</Text>
                <Select
                  size="sm"
                  value={expireSelect()}
                  onChange={(e) => {
                    const v = e as string
                    setExpireSelect(v)

                    if (v === "never") {
                      setShare("expires", null)
                    } else {
                      setShare("expires", getExpireDate(v).toISOString())
                    }
                  }}
                >
                  <SelectOptions
                    options={[
                      { key: "2h", label: "2 小时" },
                      { key: "2d", la
