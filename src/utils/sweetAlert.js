import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import 'sweetalert2/dist/sweetalert2.min.css';

const MySwal = withReactContent(Swal);

export const showSuccessAlert = (title, text) => {
  return MySwal.fire({
    title: title || 'Success!',
    text: text,
    icon: 'success',
    confirmButtonText: 'Great!',
    confirmButtonColor: '#1e3b8b',
    background: '#ffffff',
    color: '#111111',
    customClass: {
      popup: 'rounded-2xl shadow-2xl border border-gray-100',
      title: 'text-2xl font-bold font-sans text-gray-800',
      confirmButton: 'px-8 py-3 rounded-xl font-bold transition-all hover:opacity-90',
      htmlContainer: 'text-gray-600 font-medium text-base'
    },
    showClass: {
      popup: 'animate__animated animate__fadeInDown animate__faster'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOutUp animate__faster'
    }
  });
};

export const showErrorAlert = (title, text) => {
  return MySwal.fire({
    title: title || 'Error!',
    text: text,
    icon: 'error',
    confirmButtonText: 'Try Again',
    confirmButtonColor: '#ef4444',
    background: '#ffffff',
    color: '#111111',
    customClass: {
      popup: 'rounded-2xl shadow-2xl border border-red-100',
      title: 'text-2xl font-bold font-sans text-red-800',
      confirmButton: 'px-8 py-3 rounded-xl font-bold transition-all hover:opacity-90',
      htmlContainer: 'text-gray-600 font-medium text-base'
    }
  });
};

export default MySwal;
