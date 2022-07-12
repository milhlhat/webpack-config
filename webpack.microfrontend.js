const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");

const packageJson = require("../package.json");
const appVersion = packageJson.version;

module.exports = ({ serve }) => {
  return {
    optimization: {
      moduleIds: "named",
      chunkIds: "named",
      runtimeChunk: false,
    },
    plugins: [
      new ModuleFederationPlugin({
        name: "AppName",
        filename: "remoteEntry.js",
        remotes: {
          
        },
        exposes: {
         
        },
        shared: {
          ...Object.fromEntries(
            Object.entries(packageJson.dependencies).map(([module]) => [
              module,
              { singleton: true, shareScope: "default" },
            ])
          )
        },
      }),
    ],
    output: {
      publicPath: "auto",
    },
  };
};
