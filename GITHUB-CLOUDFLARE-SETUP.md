# 🚀 Hướng dẫn liên kết GitHub với Cloudflare

Tài liệu này hướng dẫn bạn cách thiết lập tự động deploy Cloudflare Workers từ GitHub.

## 📋 Tổng quan

Khi bạn hoàn tất thiết lập, mỗi khi push code lên GitHub (branch `main`, `master`, hoặc `claude/**`), GitHub Actions sẽ tự động:
1. ✅ Build project
2. ✅ Deploy lên Cloudflare Workers
3. ✅ Cập nhật secrets (API keys)

## 🔧 Bước 1: Lấy Cloudflare API Token

### 1.1 Tạo API Token

1. Truy cập [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click vào **avatar (góc phải)** → **My Profile**
3. Chọn tab **API Tokens**
4. Click nút **Create Token**

### 1.2 Chọn Template hoặc Custom

**Cách 1: Dùng Template (Đơn giản)**
- Chọn template **Edit Cloudflare Workers**
- Click **Continue to summary**
- Click **Create Token**

**Cách 2: Custom Token (Chi tiết hơn)**
- Click **Create Custom Token**
- Token name: `GitHub Actions Deploy`
- Permissions:
  - **Account** → **Workers Scripts** → **Edit**
  - **Account** → **Account Settings** → **Read**
- Account Resources: **Include** → **All accounts** (hoặc chọn account cụ thể)
- Click **Continue to summary** → **Create Token**

### 1.3 Lưu Token

⚠️ **QUAN TRỌNG**: Token chỉ hiển thị 1 lần duy nhất!
- Copy token và lưu lại
- Format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## 🔧 Bước 2: Lấy Cloudflare Account ID

1. Vào [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click vào **Workers & Pages** (menu bên trái)
3. Nhìn vào **sidebar bên phải**, bạn sẽ thấy:
   ```
   Account ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Click icon **Copy** để copy Account ID

## 🔐 Bước 3: Thiết lập GitHub Secrets

GitHub Secrets dùng để lưu thông tin nhạy cảm (API keys, tokens) mà code không thể thấy.

### 3.1 Truy cập GitHub Repository Settings

1. Mở repository của bạn trên GitHub
2. Click tab **Settings** (phải có quyền admin)
3. Trong menu bên trái, click **Secrets and variables** → **Actions**

### 3.2 Thêm Secrets

Click nút **New repository secret** và thêm các secrets sau:

#### Secret 1: CLOUDFLARE_API_TOKEN
- **Name**: `CLOUDFLARE_API_TOKEN`
- **Value**: Token từ Bước 1.3
- Click **Add secret**

#### Secret 2: CLOUDFLARE_ACCOUNT_ID
- **Name**: `CLOUDFLARE_ACCOUNT_ID`
- **Value**: Account ID từ Bước 2
- Click **Add secret**

#### Secret 3: HF_KEYS
- **Name**: `HF_KEYS`
- **Value**: HuggingFace API keys (ngăn cách bằng dấu phẩy)
- Ví dụ: `hf_key1,hf_key2,hf_key3`
- Lấy keys tại: https://huggingface.co/settings/tokens
- Click **Add secret**

#### Secret 4: GEMINI_KEYS
- **Name**: `GEMINI_KEYS`
- **Value**: Google Gemini API keys (ngăn cách bằng dấu phẩy)
- Ví dụ: `AIzaKey1,AIzaKey2,AIzaKey3`
- Lấy keys tại: https://makersuite.google.com/app/apikey
- Click **Add secret**

### 3.3 Kiểm tra Secrets

Sau khi thêm, bạn sẽ thấy 4 secrets:
```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
HF_KEYS
GEMINI_KEYS
```

## ✅ Bước 4: Kiểm tra GitHub Actions Workflow

File workflow đã được tạo tại: `.github/workflows/deploy-cloudflare.yml`

### Workflow sẽ chạy khi:
- ✅ Push code lên branch `main`, `master`, hoặc `claude/**`
- ✅ Có thay đổi trong folder `cloudflare/`
- ✅ Trigger thủ công từ GitHub Actions tab

### Xem Workflow:
1. Vào tab **Actions** trên GitHub repository
2. Chọn workflow **Deploy to Cloudflare Workers**
3. Click **Run workflow** để test thủ công (không cần push code)

## 🚀 Bước 5: Deploy lần đầu

### Cách 1: Push code
```bash
git add .
git commit -m "Setup GitHub-Cloudflare integration"
git push -u origin claude/github-cloudflare-integration-018qpMdvYVDXR7jKwGmQ6Pib
```

### Cách 2: Trigger thủ công
1. Vào tab **Actions** trên GitHub
2. Click workflow **Deploy to Cloudflare Workers**
3. Click **Run workflow**
4. Chọn branch
5. Click **Run workflow** (màu xanh)

## 📊 Bước 6: Theo dõi Deployment

1. Vào tab **Actions**
2. Click vào workflow run mới nhất
3. Click vào job **Deploy Cloudflare Worker**
4. Xem logs để theo dõi quá trình:
   - ✅ Checkout code
   - ✅ Setup Node.js
   - ✅ Install dependencies
   - ✅ Deploy to Cloudflare
   - ✅ Deployment summary

Nếu thành công, bạn sẽ thấy:
```
✅ Deployment completed successfully!
🌐 Your worker should now be available at:
https://ai-api-proxy.YOUR-SUBDOMAIN.workers.dev
```

## 🔍 Bước 7: Lấy Worker URL

### Cách 1: Từ GitHub Actions logs
- Xem phần **Deployment summary** trong logs

### Cách 2: Từ Cloudflare Dashboard
1. Vào [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Workers & Pages**
3. Click vào worker **ai-api-proxy**
4. URL sẽ hiển thị ở đầu trang:
   ```
   https://ai-api-proxy.YOUR-SUBDOMAIN.workers.dev
   ```

### Cách 3: Test với cURL
```bash
curl https://ai-api-proxy.YOUR-SUBDOMAIN.workers.dev/health
```

Kết quả:
```json
{
  "status": "ok",
  "service": "AI API Proxy",
  "endpoints": {
    "huggingface": "/api/huggingface",
    "gemini": "/api/gemini"
  },
  "stats": {
    "hf_keys": 3,
    "gemini_keys": 9
  }
}
```

## 🎯 Tổng kết

Sau khi hoàn tất các bước trên:

1. ✅ **Tự động deploy**: Mỗi lần push code → Auto deploy
2. ✅ **Bảo mật**: API keys được lưu an toàn trên GitHub Secrets
3. ✅ **Dễ quản lý**: Chỉ cần update secrets trên GitHub, không cần thay đổi code
4. ✅ **Logs chi tiết**: Xem toàn bộ quá trình deploy trên GitHub Actions

## 🔄 Cập nhật sau này

### Thay đổi API Keys:
1. Vào **Settings** → **Secrets and variables** → **Actions**
2. Click vào secret cần update
3. Click **Update secret**
4. Nhập value mới
5. Push code hoặc trigger workflow để áp dụng

### Thay đổi Cloudflare Account:
1. Update `CLOUDFLARE_ACCOUNT_ID` secret
2. Update `CLOUDFLARE_API_TOKEN` nếu cần
3. Deploy lại

## ❓ Troubleshooting

### Lỗi: "Authentication error"
- ✅ Kiểm tra `CLOUDFLARE_API_TOKEN` có đúng không
- ✅ Token có đủ quyền **Workers Scripts → Edit** không

### Lỗi: "Account not found"
- ✅ Kiểm tra `CLOUDFLARE_ACCOUNT_ID` có đúng không

### Lỗi: "Secrets not found"
- ✅ Kiểm tra đã thêm đủ 4 secrets chưa
- ✅ Tên secrets có đúng (in hoa) không

### Workflow không chạy
- ✅ Kiểm tra branch có đúng (`main`, `master`, hoặc `claude/**`) không
- ✅ Có thay đổi trong folder `cloudflare/` không
- ✅ Thử trigger thủ công từ Actions tab

## 📚 Resources

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Wrangler Action](https://github.com/cloudflare/wrangler-action)

---

**🎉 Chúc bạn deploy thành công!**

Nếu có vấn đề, hãy kiểm tra logs trong GitHub Actions tab để biết thêm chi tiết.
