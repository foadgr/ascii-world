import { IconUpload } from '@tabler/icons-react'
import { track } from '@vercel/analytics'
import { useRef } from 'react'
import s from './upload-button.module.scss'

export function UploadButton({ onFileSelect, hidden = false }) {
  const fileInputRef = useRef(null)

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.addEventListener(
        'load',
        (event) => {
          track('File Upload', {
            action: 'file_selected',
            fileType: file.type,
            fileName: file.name,
          })
          onFileSelect(event.target.result, file.name)
        },
        false
      )
      reader.readAsDataURL(file)
    }
  }

  const handleClick = () => {
    track('Upload Button', { action: 'click' })
    fileInputRef.current?.click()
  }

  if (hidden) return null

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.mp4,.mov,.webm,.png,.jpg,.jpeg,.webp,.avif,.ttf,.otf,.woff,.woff2"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className={s.uploadButton}
        onClick={handleClick}
        title="Upload file (.glb, .mp4, .mov, .webm, .png, .jpg, .webp, .avif, .ttf, .otf, .woff, .woff2)"
        aria-label="Upload file"
      >
        <div className={s.iconContainer}>
          <IconUpload size={23} />
        </div>
      </button>
    </>
  )
}
