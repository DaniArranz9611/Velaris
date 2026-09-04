// Comprime y redimensiona una imagen en el propio celular antes de subirla,
// para no gastar de más el espacio gratuito de almacenamiento.
export function comprimirImagen(archivo, anchoMaximo = 1280, calidad = 0.75) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const escala = Math.min(1, anchoMaximo / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * escala
        canvas.height = img.height * escala

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(archivo)
              return
            }
            resolve(new File([blob], archivo.name, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          calidad
        )
      }
      img.onerror = () => resolve(archivo)
      img.src = e.target.result
    }
    lector.onerror = reject
    lector.readAsDataURL(archivo)
  })
}
