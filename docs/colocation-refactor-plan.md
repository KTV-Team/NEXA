# Refactor source theo colocation

Ngày lập và thực hiện: 2026-10-07. Trạng thái: đã triển khai.

Source, TypeScript emit config, tài liệu và các kiểm tra workspace đã được cập nhật. Refactor giữ route names, API client surface, payload DTO và behavior của form/session. API lint trước đây không có ESLint dependency/config và dùng `--fix`; phần đó đã có ESLint flat config riêng cho TypeScript và chỉ báo lỗi, không tự sửa source.

Phạm vi sản phẩm theo [PRD](product-requirements.md). Giữ pnpm/Turborepo, Expo/React Native, NestJS/Fastify, TypeScript, Zod và Fetch client. Đây là thay đổi tổ chức code hiện có, không phải triển khai thêm chức năng hay lựa chọn infrastructure.

## 1. Nguyên tắc tổ chức

- Đặt code ở phạm vi nhỏ nhất phù hợp với trách nhiệm và các nơi sử dụng: component → screen → feature/module → application → shared package.
- Props, types, constants, styles và helpers nhỏ có thể ở cùng file. Chỉ tách file/thư mục khi giúp đọc, thay đổi hoặc kiểm thử tốt hơn.
- Code chỉ phục vụ một screen/component nằm cạnh screen/component đó. Dùng chung giữa các screen trong auth thì ở auth; không mặc định đưa lên common toàn ứng dụng.
- `src/components` chứa UI nền dùng chung. `src/common` chỉ được tạo khi có hook/helper độc lập nghiệp vụ thực sự dùng giữa các feature; không tạo thư mục rỗng.
- Shared cấp ứng dụng không import nội bộ của feature/screen. Không import trực tiếp từ screen này sang screen khác để tái sử dụng code riêng.
- DTO/domain types dùng giữa mobile/API ở `packages/types`; boundary schemas ở `packages/validation`; HTTP transport ở `packages/api-client`; design tokens ở package hiện có.
- Contract và service thuộc một nghiệp vụ không đổi vị trí chỉ vì hiện có một consumer. Không đưa React/native dependencies vào packages types/validation/api-client.
- Unit tests nằm cạnh source được kiểm thử. Integration tests có thể nằm ở thư mục test riêng.
- Dùng kebab-case hiện có. Không bắt mọi file có thư mục riêng, không thêm barrel vào mọi thư mục; chỉ dùng re-export cho public entry points cần thiết và tránh vòng import.

## 2. Baseline trước refactor

| Khu vực              | Bằng chứng                                                                                               | Hướng xử lý                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Mobile routes        | Login/register re-export screen; `app/index.tsx` chứa UI session/logout                                  | Giữ routes; chuyển implementation của session screen ra ngoài `app`                                         |
| Auth hook            | `useAuthForm` dùng bởi login và register                                                                 | Giữ ở cấp auth, không sao chép thành hai hook riêng                                                         |
| Auth components      | `AuthScaffold`, `FormField` phục vụ auth                                                                 | Giữ trong `features/auth/components`                                                                        |
| Register form schema | `registerFormSchema`/`RegisterFormInput` ở validation package; consumers là register screen và auth test | Chuyển phần confirm-password về cạnh register screen; giữ schema request đăng ký ở shared                   |
| Shared UI            | `src/components/ui.tsx` chứa AppText/Icon/PrimaryButton/TextLink/ErrorNotice và styles                   | Tách theo component, mỗi component sở hữu props và styles của nó                                            |
| ErrorNotice          | Có retry label đặc thù khôi phục phiên                                                                   | Đưa label vào caller auth nếu giữ component dùng chung; bảo toàn nội dung hiển thị hiện tại                 |
| NoticeDialog         | Không thấy consumer trong TS/TSX hiện tại                                                                | Kiểm tra thêm usages/dynamic references; nếu vẫn không dùng thì bỏ dead code, không giữ ở global components |
| API                  | Auth/users/health đã có thư mục riêng; controller vẫn là stub                                            | Giữ colocation trong các thư mục hiện có; không thêm tầng chỉ để đổi tên đường dẫn                          |
| Shared packages      | Types/validation/client tập trung ở `src/index.ts`                                                       | Chia theo miền nghiệp vụ và giữ public imports tương thích, trừ schema riêng của UI được chuyển về mobile   |
| Build artifacts      | `.js.map` nằm cả cạnh source và trong API dist; root TS config bật sourceMap và không có noEmit/outDir   | Xử lý emit trong bước cấu hình; không khẳng định lệnh nào đã tạo các file chỉ từ hiện trạng                 |

Backend auth thật, persistence, response envelopes và ownership vẫn là các gap đã ghi trong [API contracts](api-contracts.md). Refactor này không được báo là đã giải quyết chúng.

## 3. Cấu trúc đích của mobile

```text
apps/mobile/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx                         # Re-export account-session screen
│   ├── login.tsx
│   └── register.tsx
└── src/
    ├── features/auth/
    │   ├── screens/
    │   │   ├── login/
    │   │   │   └── login-screen.tsx
    │   │   ├── register/
    │   │   │   ├── register-screen.tsx
    │   │   │   ├── register-form.schema.ts
    │   │   │   └── register-form.schema.test.ts
    │   │   └── account-session/
    │   │       └── account-session-screen.tsx
    │   ├── components/
    │   │   ├── auth-scaffold.tsx
    │   │   └── form-field.tsx
    │   ├── hooks/
    │   │   └── use-auth-form.ts
    │   ├── auth-provider.tsx
    │   ├── auth-service.ts
    │   ├── auth-service.test.ts
    │   ├── auth-errors.ts
    │   └── session-storage.ts
    ├── components/
    │   ├── app-text.tsx
    │   ├── icon.tsx
    │   ├── primary-button.tsx
    │   ├── text-link.tsx
    │   └── error-notice.tsx
    ├── config/env.ts
    └── theme/typography.ts
```

Screen account-session chỉ là màn hình session hiện có được di chuyển, không phải profile/settings mới. Các phần riêng của login như remember checkbox và riêng của register như password checks được giữ trong screen; chỉ tách component cùng thư mục nếu việc đó giúp giảm độ phức tạp. Không thêm hook/helper/constants file chỉ để đủ mẫu thư mục.

## 4. Các bước triển khai

### Bước 0 — Baseline và phạm vi thay đổi

- Ghi nhận git status và các file người dùng đã sửa. Khi lập kế hoạch có thay đổi sẵn ở `apps/api/tsconfig.tsbuildinfo`; không reset hoặc đưa thay đổi đó vào refactor một cách tự động.
- Lập inventory source/dependencies bằng CodeGraph trước khi di chuyển; đối chiếu các file tool không trả được. Phân biệt source TS/TSX với JS/declaration sinh ra cạnh source.
- Chạy baseline mobile lint/typecheck/test, shared typecheck và API typecheck/build. Ghi riêng lỗi đã tồn tại; không coi script placeholder/no tests là bằng chứng kiểm tra thành công.
- Khi cần branch, theo `docs/commit-rules.md`: branch từ main, xử lý thay đổi local an toàn, push branch và merge qua MR được duyệt. Kế hoạch này không thực hiện push/merge.

Kết quả: giữ nguyên thay đổi sẵn ở `apps/api/tsconfig.tsbuildinfo`; TypeScript build info mới chuyển vào `.turbo/apps-api.tsbuildinfo`. Baseline test chưa được ghi nhận riêng trước khi sửa; các kiểm tra ở bước 5 là kết quả sau refactor. Không tạo branch hoặc commit.

### Bước 1 — Colocation screens và form riêng

- Di chuyển login/register screens theo cây thư mục đích; sửa imports và re-export routes, giữ nguyên tên/path routes và protected navigation.
- Chuyển UI/session/logout từ `app/index.tsx` vào account-session screen. Giữ AuthProvider, restoration, SecureStore và logout behavior hiện có.
- Di chuyển `useAuthForm` vào auth/hooks vì có hai consumers thuộc auth; không thay thuật toán hoặc tạo bản sao.
- Chuyển register form schema/type về register screen directory. Schema này mở rộng `registerSchema` shared; khi submit vẫn parse bằng schema request để không gửi confirmPassword.
- Chuyển các assertions form-confirmation hiện có sang test cạnh schema; sửa imports của test và screen. Xóa exports UI-only khỏi validation sau khi xác nhận không còn consumer workspace. Shared package không re-export ngược từ mobile.
- Acceptance: routes cũ hoạt động, validation/normalization/form errors giữ nguyên, payload không thêm field UI, test hiện có không mất assertions.

Kết quả: login, register và session landing nằm trong `src/features/auth/screens/`; Expo routes vẫn giữ `login`, `register` và `/`. `useAuthForm` nằm trong feature auth; schema confirm-password/test nằm cạnh register screen. Assertion DTO không gửi confirm-password/client role được giữ lại.

### Bước 2 — Components dùng chung và code nội bộ

- Tách `ui.tsx` thành các component trong cây đích; props, styles, icon-name type chỉ phục vụ component nào thì nằm tại component đó.
- Giữ theme và design tokens dùng chung. Không copy style tokens vào từng screen.
- Tách retry label auth khỏi ErrorNotice dùng chung bằng prop; caller login truyền đúng label hiện tại. Không đổi nội dung, accessibility hoặc hành vi retry.
- Sửa toàn bộ imports. Có thể dùng re-export `ui.tsx` tạm thời trong quá trình chuyển, nhưng kết thúc phải không còn consumer của đường dẫn cũ rồi mới xóa file.
- Với NoticeDialog, xác nhận không có consumer trước khi bỏ. Nếu phát hiện consumer thì đặt ở phạm vi của consumer thay vì xóa.
- Acceptance: UI nền không import auth/screens; screen-local code không bị kéo lên global; layout, loading/disabled, focus, password visibility, checkbox, keyboard và accessibility được bảo toàn.

Kết quả: shared UI components có file riêng trong `src/components`; prop types/styles nằm cùng component. Auth scaffold/FormField vẫn thuộc feature auth. `NoticeDialog` không có consumer và đã được xóa. Retry label được truyền từ login screen.

### Bước 3 — Shared packages và API

- Types: chia `common.ts`, `auth.ts`, `users.ts`, `health.ts`; index chỉ re-export public contract.
- Validation: chia `auth.ts`, `users.ts`, `pagination.ts`; giữ Zod re-export và các schema/type cần dùng giữa boundaries. Register form schema riêng không ở đây.
- API client: tách client transport/config, errors và endpoint groups auth/users/health; giữ `createApiClient` và `api.auth/users/health` tương thích. Đặt transport config/error type cạnh transport.
- Khi tách client, bảo toàn timeout, abort, bearer token, 401 callback, envelope parsing, 204 handling và endpoint paths. Không sửa contract mismatch trong commit refactor.
- Giữ integration checks cho shared validation/transport trong auth service test hiện có vì mobile Vitest đã thực thi chúng; đặt test chỉ dành cho confirm-password cạnh schema của register screen. Không thêm runner mới cho các package chỉ để đổi vị trí tests.
- API giữ auth/users/health colocated. Không tạo service/repository rỗng hoặc thêm database; nếu phát hiện code thực sự dùng chung mới tách tại phạm vi phù hợp.
- Acceptance: public contract/client shape giữ nguyên; không có vòng dependency hoặc shared package phụ thuộc vào app.

Kết quả: types, validation và client được chia file theo common/domain/endpoint; public barrel imports được giữ tương thích. Schema của register form đã tách khỏi shared validation. Typecheck của các package đạt.

### Bước 4 — Ngăn build artifacts làm rối source

- Tách mục đích typecheck và build: cấu hình dùng để kiểm tra source phải `noEmit`; build API có cấu hình emit riêng vào dist, override noEmit một cách rõ ràng.
- Kiểm tra cả root TS config và config mobile (mobile extends Expo base), các package shared export source và config API. Không đặt noEmit ở base rồi vô tình làm API build không xuất file.
- Mặc định tắt JS source maps cho các đường build do dự án quản lý để không tái sinh `*.js.map`; kiểm tra effective config và output thực tế. Không chỉnh compiler/transpiler của thư viện cài sẵn.
- `.gitignore` đã có `*.js.map`; ignore không ngăn compiler sinh file. Kiểm tra lại sau typecheck/build.
- Phân loại file JS: giữ các file cấu hình ESLint/Babel; `apps/api/dist` là output build được quản lý riêng. Không tìm thấy JS/declaration được sinh cạnh các file TS/TSX source; không xóa config hoặc build output bằng glob.
- Acceptance: typecheck không emit cạnh source; API build vẫn có entry point hợp lệ; không có project-owned `*.js.map` mới sau checks.

Kết quả: root config đặt `sourceMap:false`/`noEmit:true`; mobile cũng không emit/map; API bật emit rõ ràng vào `dist` và lưu build info trong `.turbo`. API build thành công, không sinh maps. API ESLint dùng TypeScript parser/recommended rules và script không có `--fix`.

### Bước 5 — Kiểm tra cuối và cập nhật tài liệu

- Chạy mobile lint/typecheck/test, shared typecheck và tests đã cấu hình, API typecheck/build. Lint kiểm tra không tự sửa source; API lint script hiện có `--fix` cần được xử lý trước khi dùng làm gate.
- Kiểm tra imports cũ, exports không dùng, vòng dependencies và artifacts sinh cạnh source. Kiểm tra `git diff --check` và toàn bộ diff.
- Smoke test login/register/session/restore/logout, navigation và form interaction trên môi trường sẵn có; ghi rõ platform đã thực sự chạy. Browser/mock kiểm tra không chứng nhận native behavior hay auth backend thật.
- Cập nhật README, architecture và auth handoff cho đường dẫn mới; tìm và sửa links/import examples bị ảnh hưởng. Thêm convention colocation vào AGENTS.md, giữ product authority hiện có.
- Commit theo nhóm: mobile colocation, shared organization/tests, build configuration, documentation. Không gộp sửa nghiệp vụ hoặc triển khai MVP mới vào các commit này.

Kết quả: mobile lint/typecheck và Expo export đạt; 17 tests trong 2 file mobile đạt. Typecheck của các shared packages, API typecheck/build/lint và `git diff --check` đạt. Expo export đã bundle iOS, Android và web routes. Kiểm tra lại workspace sau export không còn project-owned `*.js.map`. README mobile, architecture, auth handoff và AGENTS đã được cập nhật. Chưa commit.

## 5. Cleanup artifacts đã thực hiện

- Đã xóa 41 file `*.js.map`: mobile 18, API 16 (source và dist), web scaffold 3, bốn shared packages mỗi package 1.
- Không có file `*.js.map` tracked trong Git tại thời điểm kiểm tra; deletion chỉ tác động artifacts local.
- Đường dẫn được kiểm tra nằm trong workspace; loại trừ dependencies `node_modules`, `.pnpm-store`, Git/CodeGraph metadata và reparse points.
- Đã xác nhận các map vừa xóa không còn. Build API sau refactor tiếp tục không sinh map files.

## 6. Điều kiện hoàn thành refactor

- Code riêng của screen/component nằm tại đúng phạm vi; code shared có owner và ranh giới imports rõ.
- Route names, UI behavior, DTOs và transport semantics hiện có được bảo toàn, ngoại trừ việc di chuyển UI-only form schema đã cập nhật toàn bộ consumers.
- Các kiểm tra phù hợp chạy được; lỗi baseline và giới hạn kiểm chứng được ghi rõ, không báo hoàn thành nếu gate cần thiết chưa đạt.
- Không có project-owned JS maps hoặc compiler output phát sinh cạnh source sau vòng kiểm tra.
- Tài liệu trỏ đúng source; thay đổi local có sẵn không bị mất; không thêm tính năng, dependency hoặc module tương lai ngoài nhu cầu refactor.

Trạng thái: đạt theo các kiểm tra chạy ngày 2026-10-07. Diff vẫn có thay đổi local tồn tại trước refactor ở `apps/api/tsconfig.tsbuildinfo`; file đó không bị reset.
