<script lang="ts" setup>
import { computed } from "vue";
import { getObjVal, customDestr } from "@iceywu/utils";

const props = defineProps<{
  data: {
    exif: Record<string, any>;
  };
}>();

const imgMetaData = computed(() => {
  const info_enum = [
    {
      key: "Model",
      label: "拍摄设备",
      value: "",
      valFormat: (val: string) => {
        return val ?? "--";
      },
    },
    {
      key: "LensModel",
      label: "镜头型号",
      value: "",
      valFormat: (val: string) => {
        return val ?? "--";
      },
    },
    {
      key: "ISOSpeedRatings",
      label: "ISO",
      value: "",
      valFormat: (val: string) => {
        return val ?? "--";
      },
    },
    {
      key: "FocalLengthIn35mmFilm",
      label: "焦距",
      value: "",
      valFormat: (val: string) => {
        return val ?? "--";
      },
    },
    {
      key: "FNumber",
      label: "光圈",
      value: "",
      valFormat: (val: string) => {
        const num = eval(val) || 0;
        return `f/${num?.toFixed(1)}`;
      },
    },
    {
      key: "ShutterSpeedValue",
      label: "快门",
      value: "",
      valFormat: (val: string) => {
        return val ?? "--";
      },
    },
    {
      key: "GPSAltitude",
      label: "海拔",
      value: "",
      valFormat: (val: string) => {
        return val ?? "--";
      },
    },
    {
      key: "DateTimeOriginal",
      label: "拍摄时间",
      value: "",
      valFormat: (val: string) => {
        return val ?? "--";
      },
    },
    {
      key: "location",
      label: "拍摄地点",
      value: "",
      valFormat: (val: string) => {
        return val ?? "未知";
      },
    },
  ];
  const exifData = customDestr(props.data?.exif || {}, { customVal: {} });
  
  info_enum.forEach((item) => {
    const rawValue = getObjVal(exifData, item.key, { value: "" })?.value || "";
    item.value = item.valFormat ? item.valFormat(rawValue) : rawValue;
  });

  return info_enum;
});

const getMetaByKey = (key: string) => {
  if (!imgMetaData.value) return { key: "", label: "", value: "" };
  return (
    imgMetaData.value.find((item) => item.key === key) || {
      key: "",
      label: "",
      value: "",
    }
  );
};
</script>
<template>
  <div class="metadata-panel">
    <!-- 相机信息 -->
    <div class="metadata-header">
      <div class="camera-info">
        <div class="camera-model">{{ getMetaByKey("Model")?.value }}</div>
        <div class="lens-model">{{ getMetaByKey("LensModel")?.value }}</div>
      </div>
    </div>

    <!-- 曝光参数 -->
    <div class="exposure-settings">
      <div class="metadata-item">
        <div class="value">{{ getMetaByKey("ISOSpeedRatings")?.value }}</div>
        <div class="label">{{ getMetaByKey("ISOSpeedRatings")?.label }}</div>
      </div>
      <div class="metadata-item">
        <div class="value">{{ getMetaByKey("FNumber")?.value }}</div>
        <div class="label">{{ getMetaByKey("FNumber")?.label }}</div>
      </div>
      <div class="metadata-item">
        <div class="value">{{ getMetaByKey("ShutterSpeedValue")?.value }}</div>
        <div class="label">{{ getMetaByKey("ShutterSpeedValue")?.label }}</div>
      </div>
    </div>

    <!-- 焦距 -->
    <div class="info-row">
      <span class="info-label">{{ getMetaByKey("FocalLengthIn35mmFilm")?.label }}:</span>
      <span class="info-value">{{ getMetaByKey("FocalLengthIn35mmFilm")?.value }}</span>
    </div>

    <!-- 位置信息 -->
    <div class="info-row">
      <span class="info-label">📍 {{ getMetaByKey("location")?.label }}:</span>
      <span class="info-value">{{ getMetaByKey("location")?.value }}</span>
    </div>

    <!-- 海拔 -->
    <div class="info-row">
      <span class="info-label">{{ getMetaByKey("GPSAltitude")?.label }}:</span>
      <span class="info-value">{{ getMetaByKey("GPSAltitude")?.value }}</span>
    </div>

    <!-- 拍摄时间 -->
    <div class="info-row">
      <span class="info-label">🕒 {{ getMetaByKey("DateTimeOriginal")?.label }}:</span>
      <span class="info-value">{{ getMetaByKey("DateTimeOriginal")?.value }}</span>
    </div>
  </div>
</template>
<style scoped>
.metadata-panel {
  padding: 12px 0;
  color: #fff;
  font-size: 14px;
}

.metadata-header {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.camera-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.camera-model {
  font-size: 16px;
  font-weight: 600;
  color: #60a5fa;
}

.lens-model {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.exposure-settings {
  display: flex;
  justify-content: space-around;
  padding: 12px;
  margin-bottom: 12px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.metadata-item {
  flex: 1;
  text-align: center;
}

.metadata-item .value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #60a5fa;
}

.metadata-item .label {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

.info-value {
  color: rgba(255, 255, 255, 0.9);
  text-align: right;
  margin-left: 12px;
}
</style>