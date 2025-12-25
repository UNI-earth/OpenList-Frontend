import {
  HStack,
  Icon,
  Progress,
  ProgressIndicator,
  ProgressLabel,
  Text,
  IconButton,
  Box,
} from "@hope-ui/solid"
import { Motion } from "solid-motionone"
import { useContextMenu } from "solid-contextmenu"
import { batch, Show } from "solid-js"
import { LinkWithPush } from "~/components"
import { useDownload, usePath, useRouter, useUtil } from "~/hooks"
import {
  checkboxOpen,
  getMainColor,
  getSettingBool,
  local,
  OrderBy,
  selectIndex,
} from "~/store"
import { MountDetails, ObjType, StoreObj } from "~/types"
import {
  bus,
  formatDate,
  getFileSize,
  hoverColor,
  showDiskUsage,
  usedPercentage,
  toReadableUsage,
  nearlyFull,
} from "~/utils"
import { getIconByObj } from "~/utils/icon"
import { ItemCheckbox, useSelectWithMouse } from "./helper"
import { operations } from "../toolbar/operations"

export interface Col {
  name: OrderBy
  textAlign: "left" | "right"
  w: any
}

export const cols: Col[] = [
  { name: "name", textAlign: "left", w: { "@initial": "76%", "@md": "65%" } },
  { name: "size", textAlign: "right", w: { "@initial": "24%", "@md": "12%" } },
  { name: "modified", textAlign: "right", w: { "@initial": 0, "@md": "23%" } },
]

export const ListItem = (props: { obj: StoreObj; index: number }) => {
  const { isHide } = useUtil()
  if (isHide(props.obj)) {
    return null
  }
  const { setPathAs } = usePath()
  const { show } = useContextMenu({ id: 1 })
  const { pushHref, to } = useRouter()
  const { batchDownloadSelected } = useDownload() 
  const { openWithDoubleClick, toggleWithClick, restoreSelectionCache } =
    useSelectWithMouse()
  const filenameStyle = () => local["list_item_filename_overflow"]

  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{ width: "100%" }}
    >
      <HStack
        role="group"
        classList={{ selected: !!props.obj.selected }}
        class="list-item viselect-item"
        data-index={props.index}
        w="$full"
        p="$2"
        rounded="$lg"
        transition="all 0.3s"
        _hover={{
          transform: "scale(1.01)",
          bgColor: hoverColor(),
        }}
        as={LinkWithPush}
        href={props.obj.name}
        cursor={
          openWithDoubleClick() || toggleWithClick() ? "default" : "pointer"
        }
        bgColor={props.obj.selected ? hoverColor() : undefined}
        on:dblclick={() => {
          if (!openWithDoubleClick()) return
          selectIndex(props.index, true, true)
          to(pushHref(props.obj.name))
        }}
        on:click={(e: MouseEvent) => {
          if (openWithDoubleClick()) return
          if (e.ctrlKey || e.metaKey || e.shiftKey) return
          if (!restoreSelectionCache()) return
          if (toggleWithClick())
            return selectIndex(props.index, !props.obj.selected)
          to(pushHref(props.obj.name))
        }}
        onMouseEnter={() => {
          setPathAs(props.obj.name, props.obj.is_dir, true)
        }}
        onContextMenu={(e: MouseEvent) => {
          batch(() => {
            selectIndex(props.index, true, true)
          })
          show(e, { props: props.obj })
        }}
      >
        <HStack class="name-box" spacing="$1" w={cols[0].w} flexShrink={0} position="relative">
          <Show when={checkboxOpen()}>
            <ItemCheckbox
              on:mousedown={(e: MouseEvent) => e.stopPropagation()}
              on:click={(e: MouseEvent) => e.stopPropagation()}
              checked={props.obj.selected}
              onChange={(e: any) => {
                selectIndex(props.index, e.target.checked)
              }}
            />
          </Show>
          <Icon
            class="icon"
            boxSize="$6"
            color={getMainColor()}
            as={getIconByObj(props.obj)}
            mr="$1"
            cursor={props.obj.type !== ObjType.IMAGE ? "inherit" : "pointer"}
            on:click={(e: MouseEvent) => {
              if (props.obj.type !== ObjType.IMAGE) return
              if (e.ctrlKey || e.metaKey || e.shiftKey) return
              if (!restoreSelectionCache()) return
              bus.emit("gallery", props.obj.name)
              e.preventDefault()
              e.stopPropagation()
            }}
          />
          <Text
            class="name"
            flex={1}
            pr="$24"
            css={{
              wordBreak: "break-all",
              whiteSpace: filenameStyle() === "multi_line" ? "unset" : "nowrap",
              "overflow-x": filenameStyle() === "scrollable" ? "auto" : "hidden",
              textOverflow: filenameStyle() === "ellipsis" ? "ellipsis" : "unset",
              "scrollbar-width": "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
            title={props.obj.name}
          >
            {props.obj.name}
          </Text>

          {/* 悬浮按钮组 */}
          <Box
            position="absolute"
            right="$4" // 调整偏移量，让按钮整体往左移一点
            top="50%"
            transform="translateY(-50%)"
            opacity={0}
            _groupHover={{ opacity: 1 }}
            transition="opacity 0.2s"
            zIndex={10}
            on:click={(e: MouseEvent) => e.stopPropagation()}
          >
            <HStack spacing="$1">
              {/* 分享按钮：位置固定 */}
              <IconButton
                variant="ghost"
                size="md"
                compact
                aria-label="share"
                icon={<Icon as={operations["share"].icon} color={operations["share"].color} boxSize="$5" />}
                on:click={(e: MouseEvent) => {
                  e.preventDefault()
                  e.stopPropagation()
                  batch(() => { selectIndex(props.index, true, true) })
                  bus.emit("tool", "share")
                }}
              />
              
              {/* 下载按钮占位区：固定宽度确保分享按钮在左侧对齐 */}
              <Box w="40px" display="flex" justifyContent="center">
                <Show when={!props.obj.is_dir}>
                  <IconButton
                    variant="ghost"
                    size="md"
                    compact
                    aria-label="download"
                    icon={<Icon as={operations["download"].icon} color={operations["download"].color} boxSize="$5" />}
                    on:click={(e: MouseEvent) => {
                      e.preventDefault()
                      e.stopPropagation()
                      batch(() => { selectIndex(props.index, true, true) })
                      batchDownloadSelected()
                    }}
                  />
                </Show>
              </Box>
            </HStack>
          </Box>
        </HStack>

        <Show
          fallback={
            <Text class="size" w={cols[1].w} textAlign={cols[1].textAlign as any}>
              {getFileSize(props.obj.size)}
            </Text>
          }
          when={showDiskUsage(props.obj.mount_details)}
        >
          <Show
            fallback={
              <Text class="size" w={cols[1].w} textAlign={cols[1].textAlign as any}>
                {toReadableUsage(props.obj.mount_details!)}
              </Text>
            }
            when={!getSettingBool("show_disk_usage_in_plain_text")}
          >
            <Progress
              w={cols[1].w}
              class="disk-usage-percentage"
              trackColor="$info3"
              rounded="$full"
              size="md"
              value={usedPercentage(props.obj.mount_details!)}
            >
              <ProgressIndicator
                color={nearlyFull(props.obj.mount_details!) ? "$danger6" : "$info6"}
                rounded="$md"
              />
              <ProgressLabel class="disk-usage-text">
                {toReadableUsage(props.obj.mount_details!)}
              </ProgressLabel>
            </Progress>
          </Show>
        </Show>
        <Text
          class="modified"
          display={{ "@initial": "none", "@md": "inline" }}
          w={cols[2].w}
          textAlign={cols[2].textAlign as any}
        >
          {formatDate(props.obj.modified)}
        </Text>
      </HStack>
    </Motion.div>
  )
}
