// vite.config.js
import { defineConfig } from "file:///C:/Users/globi/sms/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/globi/sms/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    mainFields: ["browser", "module", "main"],
    alias: {
      "fs": "path-browserify",
      "stream": "stream-browserify",
      "path": "path-browserify",
      "vm": "vm-browserify"
    }
  },
  define: {
    global: "globalThis"
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
    },
    hmr: {
      host: "127.0.0.1"
    },
    watch: {
      ignored: ["**/android/**", "**/ios/**"]
    }
  },
  build: {
    sourcemap: true
  },
  optimizeDeps: {
    include: ["react-easy-crop"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxnbG9iaVxcXFxzbXNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGdsb2JpXFxcXHNtc1xcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvZ2xvYmkvc21zL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW3JlYWN0KCldLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIG1haW5GaWVsZHM6IFsnYnJvd3NlcicsICdtb2R1bGUnLCAnbWFpbiddLFxyXG4gICAgYWxpYXM6IHtcclxuICAgICAgJ2ZzJzogJ3BhdGgtYnJvd3NlcmlmeScsXHJcbiAgICAgICdzdHJlYW0nOiAnc3RyZWFtLWJyb3dzZXJpZnknLFxyXG4gICAgICAncGF0aCc6ICdwYXRoLWJyb3dzZXJpZnknLFxyXG4gICAgICAndm0nOiAndm0tYnJvd3NlcmlmeSdcclxuICAgIH1cclxuICB9LFxyXG4gIGRlZmluZToge1xyXG4gICAgZ2xvYmFsOiAnZ2xvYmFsVGhpcydcclxuICB9LFxyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogJzEyNy4wLjAuMScsXHJcbiAgICBwb3J0OiA1MTczLFxyXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0Nyb3NzLU9yaWdpbi1PcGVuZXItUG9saWN5JzogJ3NhbWUtb3JpZ2luLWFsbG93LXBvcHVwcydcclxuICAgIH0sXHJcbiAgICBobXI6IHtcclxuICAgICAgaG9zdDogJzEyNy4wLjAuMScsXHJcbiAgICB9LFxyXG4gICAgd2F0Y2g6IHtcclxuICAgICAgaWdub3JlZDogWycqKi9hbmRyb2lkLyoqJywgJyoqL2lvcy8qKiddXHJcbiAgICB9XHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgc291cmNlbWFwOiB0cnVlXHJcbiAgfSxcclxuICBvcHRpbWl6ZURlcHM6IHtcclxuICAgIGluY2x1ZGU6IFsncmVhY3QtZWFzeS1jcm9wJ11cclxuICB9XHJcbn0pXHJcblxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdQLFNBQVMsb0JBQW9CO0FBQzdRLE9BQU8sV0FBVztBQUdsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsU0FBUztBQUFBLElBQ1AsWUFBWSxDQUFDLFdBQVcsVUFBVSxNQUFNO0FBQUEsSUFDeEMsT0FBTztBQUFBLE1BQ0wsTUFBTTtBQUFBLE1BQ04sVUFBVTtBQUFBLE1BQ1YsUUFBUTtBQUFBLE1BQ1IsTUFBTTtBQUFBLElBQ1I7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLElBQ1osU0FBUztBQUFBLE1BQ1AsOEJBQThCO0FBQUEsSUFDaEM7QUFBQSxJQUNBLEtBQUs7QUFBQSxNQUNILE1BQU07QUFBQSxJQUNSO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxTQUFTLENBQUMsaUJBQWlCLFdBQVc7QUFBQSxJQUN4QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFdBQVc7QUFBQSxFQUNiO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsaUJBQWlCO0FBQUEsRUFDN0I7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
