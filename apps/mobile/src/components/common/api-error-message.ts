import { ApiClientError } from '@nexa/api-client';

/** Returns user-facing copy without exposing server response details. */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError))
    return 'Không thể kết nối dịch vụ. Kiểm tra mạng rồi thử lại.';

  if (error.code === 'TIMEOUT')
    return 'Kết nối mất quá nhiều thời gian. Kiểm tra mạng rồi thử lại.';

  if (error.statusCode === 400 || error.statusCode === 422)
    return 'Thông tin chưa hợp lệ. Kiểm tra lại các trường rồi thử lại.';
  if (error.statusCode === 401)
    return 'Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.';
  if (error.statusCode === 403)
    return 'Bạn không có quyền thực hiện thao tác này.';
  if (error.statusCode === 404)
    return 'Nội dung không còn khả dụng.';
  if (error.statusCode === 409)
    return 'Thao tác đang có xung đột. Hãy tải lại dữ liệu rồi thử lại.';
  if (error.statusCode >= 500)
    return 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.';

  return 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
}
