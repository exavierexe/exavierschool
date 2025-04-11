/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config) => {
    config.module.rules.push({
      test: /\.csv$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            outputPath: 'public/',
          },
        },
      ],
    });
    return config;
  },
};

module.exports = nextConfig; 