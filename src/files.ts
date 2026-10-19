// Saves data as a JSON file in the user's downloads
export function downloadJSON(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

// Lets the user pick a JSON file and returns its parsed content (null if cancelled or not valid JSON)
export function pickJSONFile(): Promise<any | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json,.json"
    input.addEventListener("change", async () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      try {
        resolve(JSON.parse(await file.text()))
      } catch {
        alert("The file is not a valid JSON file")
        resolve(null)
      }
    })
    input.click()
  })
}
