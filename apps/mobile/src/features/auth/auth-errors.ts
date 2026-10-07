import { ApiClientError } from '@nexa/api-client';

export function authErrorMessage(error: unknown, registering = false): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'STORAGE_UNAVAILABLE')
      return 'Không thể lưu phiên trên thiết bị. Hãy thử đăng nhập và bỏ chọn duy trì đăng nhập.';
    if (error.statusCode === 401 || error.statusCode === 403)
      return 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.';
    if (error.statusCode === 409)
      return 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.';
    if (error.statusCode === 429)
      return 'Bạn đã thử quá nhiều lần. Vui lòng đợi một chút rồi thử lại.';
    if (error.code === 'TIMEOUT')
      return 'Kết nối mất quá nhiều thời gian. Kiểm tra mạng rồi thử lại.';
    if (error.statusCode === 404 && registering)
      return 'Dịch vụ đăng ký chưa sẵn sàng. Vui lòng thử lại sau.';
    if (error.statusCode >= 500 || error.code === 'INVALID_RESPONSE')
      return 'Dịch vụ xác thực chưa sẵn sàng. Vui lòng thử lại sau.';
    if (error.statusCode === 400 || error.statusCode === 422)
      return 'Thông tin chưa hợp lệ. Kiểm tra lại các trường rồi thử lại.';
  }
  return 'Không thể kết nối dịch vụ. Kiểm tra mạng rồi thử lại.';
}
