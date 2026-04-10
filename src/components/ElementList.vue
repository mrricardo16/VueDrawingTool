<template>
  <div ref="elementsList" class="elements-list" @scroll.passive="onScroll">
    <!--
      虚拟滚动容器：无论数据量多大，DOM 始终只保留约 30 个节点。
      彻底消除 5000+ DOM 节点导致的 mouseover CSS 追踪开销（性能报告 22626ms 根本原因）。
    -->
    <div :style="{ height: totalHeight + 'px', position: 'relative' }">
      <div :style="translateStyle">
        <div
          v-for="element in visibleElements"
          :key="element.id"
          class="element-item"
          :class="{ selected: isElementSelected(element) }"
          @click="selectElement(element.type, element.id)"
          @dblclick.stop="focusElement(element.type, element.id)"
        >
          <span class="element-id">{{ element.id }}</span>
          <span class="element-type">{{ getElementTypeInfo(element) }}</span>
          <span class="element-name">{{ element.name || "未命名" }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const ITEM_HEIGHT = 36; // padding(8×2)+内容(14px)+边框(2px)+margin(4px)
const BUFFER_COUNT = 8; // 可视区上下缓冲条目数

export default {
  name: "ElementList",
  props: {
    points: { type: Array, default: () => [] },
    lines: { type: Array, default: () => [] },
    texts: { type: Array, default: () => [] },
    bsplines: { type: Array, default: () => [] },
    areas: { type: Array, default: () => [] },
    selectedPoints: { type: Array, default: () => [] },
    selectedLines: { type: Array, default: () => [] },
    selectedTexts: { type: Array, default: () => [] },
    selectedAreas: { type: Array, default: () => [] },
    filterText: { type: String, default: "" },
    sortAsc: { type: Boolean, default: true },
  },
  emits: ["select-element", "focus-element"],
  data() {
    return {
      scrollTop: 0,
      containerHeight: 400,
    };
  },
  computed: {
    // 轻量列表：只提取显示所需最少字段，避免 ...spread 每个对象的 GC 压力
    allElements() {
      const els = [];

      for (const p of this.points) {
        els.push({
          id: p.id,
          type: "point",
          name: p.name,
          pointType: p.type,
          fields: p.fields || {},
        });
      }

      for (const l of this.lines) {
        els.push({ id: l.id, type: "line", name: l.name, mode: l.mode });
      }

      for (const b of this.bsplines) {
        els.push({ id: b.id, type: "curve", name: b.name, mode: b.mode });
      }

      for (const t of this.texts) {
        els.push({ id: t.id, type: "text", name: t.name });
      }

      for (const a of this.areas) {
        els.push({ id: a.id, type: "area", name: a.name });
      }

      return els;
    },

    // Set 替代 Array.includes()：O(1) 查找
    selectedPointsSet() {
      return new Set(this.selectedPoints);
    },

    selectedLinesSet() {
      return new Set(this.selectedLines);
    },

    selectedTextsSet() {
      return new Set(this.selectedTexts);
    },

    selectedAreasSet() {
      return new Set(this.selectedAreas);
    },

    // 经过过滤后的元素集（由 `filterText` 模糊匹配 id/type/name）
    filteredElements() {
      const term = (this.filterText || "").toString().trim().toLowerCase();
      let list = this.allElements.slice();

      if (term) {
        list = list.filter((el) => {
          const idStr = (el.id || "").toString().toLowerCase();
          const nameStr = (el.name || "").toString().toLowerCase();
          const typeStr = (this.getElementTypeInfo(el) || "").toString().toLowerCase();
          return idStr.includes(term) || nameStr.includes(term) || typeStr.includes(term);
        });
      }

      // 按 id 排序（优先数值比较），支持升序/降序切换
      list.sort((a, b) => {
        const ai = Number(a.id);
        const bi = Number(b.id);
        if (!Number.isNaN(ai) && !Number.isNaN(bi)) {
          return this.sortAsc ? ai - bi : bi - ai;
        }
        const as = (a.id || "").toString();
        const bs = (b.id || "").toString();
        return this.sortAsc ? as.localeCompare(bs) : bs.localeCompare(as);
      });

      return list;
    },

    totalHeight() {
      return this.filteredElements.length * ITEM_HEIGHT;
    },

    visibleStart() {
      return Math.max(0, Math.floor(this.scrollTop / ITEM_HEIGHT) - BUFFER_COUNT);
    },

    visibleEnd() {
      return Math.min(
        this.filteredElements.length,
        Math.ceil((this.scrollTop + this.containerHeight) / ITEM_HEIGHT) + BUFFER_COUNT
      );
    },

    visibleElements() {
      return this.filteredElements.slice(this.visibleStart, this.visibleEnd);
    },

    offsetY() {
      return this.visibleStart * ITEM_HEIGHT;
    },

    translateStyle() {
      return {
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        transform: "translateY(" + this.offsetY + "px)",
      };
    },
  },

  mounted() {
    const el = this.$refs.elementsList;

    if (el) {
      this.containerHeight = el.clientHeight || 400;

      if (typeof ResizeObserver !== "undefined") {
        this._ro = new ResizeObserver((entries) => {
          for (const e of entries) {
            this.containerHeight = e.contentRect.height;
          }
        });

        this._ro.observe(el);
      }
    }
  },

  beforeUnmount() {
    this._ro?.disconnect();
  },

  methods: {
    onScroll(e) {
      this.scrollTop = e.target.scrollTop;
    },

    getElementTypeInfo(el) {
      if (el.type === "point") {
        // 优先使用显式类型（后端若有 type 字段）
        const map = {
          point: "普通点",
          site: "站点",
          rest: "休息点",
          charging: "充电点",
          escape: "紧急出口",
          staging: "暂存站点",
        };

        if (el.pointType && map[el.pointType]) {
          return map[el.pointType];
        }

        // 否则根据 fields 做兼容映射（后端常用字段名）
        const f = el.fields || {};

        if (f.stagingSite === "true" || f.staging === "true") return "暂存站点";
        if (f.charge === "true" || f.charging === "true") return "充电点";
        if (f.escape === "true") return "紧急出口";
        if (f.standby === "true" || f.rest === "true") return "休息点";
        if (f.shelf === "true" || f.site === "true") return "站点";

        return "普通点";
      }

      if (el.type === "line") {
        return el.mode === "single" ? "单向线" : "双向线";
      }

      if (el.type === "curve") {
        return el.mode === "single" ? "单向曲线" : "双向曲线";
      }

      if (el.type === "text") {
        return "文本";
      }

      if (el.type === "area") {
        return "区域";
      }

      return el.type;
    },

    isElementSelected(el) {
      const total =
        this.selectedPoints.length +
        this.selectedLines.length +
        this.selectedTexts.length +
        this.selectedAreas.length;

      if (total !== 1) {
        return false;
      }

      if (el.type === "point") {
        return this.selectedPointsSet.has(el.id);
      }

      if (el.type === "line" || el.type === "curve") {
        return this.selectedLinesSet.has(el.id);
      }

      if (el.type === "text") {
        return this.selectedTextsSet.has(el.id);
      }

      if (el.type === "area") {
        return this.selectedAreasSet.has(el.id);
      }

      return false;
    },

    selectElement(type, id) {
      this.$emit("select-element", type, id);
    },

    focusElement(type, id) {
      this.$emit("focus-element", type, id);
    },

    scrollToElement(elementId) {
      const idx = this.filteredElements.findIndex((e) => e.id === elementId);

      if (idx < 0) {
        return;
      }

      const container = this.$refs.elementsList;

      if (!container) {
        return;
      }

      const top = Math.max(0, idx * ITEM_HEIGHT - (this.containerHeight - ITEM_HEIGHT) / 2);

      container.scrollTo({ top, behavior: "smooth" });
      this.scrollTop = top;
    },
  },
};
</script>

<style scoped>
.elements-list {
  flex: 1;
  overflow-y: auto;
  background: #374151;
  border-bottom: 1px solid #4a5568;
}
.element-item {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 等分三列：序号 - 类型 - 名称 */
  align-items: center;
  padding: 4px 4px; /* 更贴边 */
  margin-bottom: 6px;
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}
.element-item:hover {
  background: #4a5568;
  border-color: #718096;
}
.element-item.selected {
  background: #4299e1;
  border-color: #63b3ed;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.3);
}
.element-item.selected .element-id,
.element-item.selected .element-type,
.element-item.selected .element-name {
  color: #ffffff;
}
.element-id {
  color: #a0aec0;
  font-weight: 600;
  font-size: 12px;
  text-align: left;
  padding: 2px 4px;
}
.element-type {
  color: #4299e1;
  font-size: 12px;
  text-align: center;
  padding: 2px 4px;
}
.element-name {
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 4px;
}
.elements-list::-webkit-scrollbar {
  width: 6px;
}
.elements-list::-webkit-scrollbar-track {
  background: #2d3748;
}
.elements-list::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 3px;
}
.elements-list::-webkit-scrollbar-thumb:hover {
  background: #718096;
}
</style>
