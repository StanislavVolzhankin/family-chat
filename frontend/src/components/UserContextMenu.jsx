import { useEffect, useRef } from 'react'
import { useLang } from '../context/LangContext'
import styles from './UserContextMenu.module.css'

function UserContextMenu({ x, y, onCreateChat, onClose }) {
  const { t } = useLang()
  const menuRef = useRef(null)

  useEffect(() => {
    function handleMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={{ top: y, left: x }}
    >
      <button className={styles.item} onClick={onCreateChat}>
        {t.private_chat.create}
      </button>
    </div>
  )
}

export default UserContextMenu
