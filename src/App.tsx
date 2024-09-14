// App.tsx

import React, { useState } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  GripVerticalIcon
} from 'lucide-react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from 'react-beautiful-dnd'

interface Tab {
  name: { [key: string]: string }
  objectLayoutBoxes: Box[]
  priority: number
}

interface Box {
  objectLayoutRows: Row[]
  collapsable: boolean
  name: { [key: string]: string }
  priority: number
  type: string
}

interface Row {
  objectLayoutColumns: Column[]
  priority: number
}

interface Column {
  objectFieldName: string
  size: number
  priority: number
}

export default function App() {
  const [fullJsonData, setFullJsonData] = useState<any>({})
  const [availableFields, setAvailableFields] = useState<any[]>([])
  const [jsonData, setJsonData] = useState<{ objectLayoutTabs: Tab[] } | null>(
    null
  )
  const [selectedLanguage, setSelectedLanguage] = useState('pt_BR')

  const updateJson = (newData: { objectLayoutTabs: Tab[] }) => {
  setJsonData(newData)

    setFullJsonData((prevValue: any) => {
      return {
        ...prevValue,
        objectLayouts: [newData]
      }
    })
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !jsonData) return

    const { source, destination } = result

    // Extract indices from droppableId
    const [sourceTabIndex, sourceBoxIndex] = source.droppableId
      .split('-')
      .map(Number)
    const [destTabIndex, destBoxIndex] = destination.droppableId
      .split('-')
      .map(Number)

    // Only handle drag within the same box
    if (sourceTabIndex === destTabIndex && sourceBoxIndex === destBoxIndex) {
      const newJsonData = { ...jsonData }
      const tab = newJsonData.objectLayoutTabs[sourceTabIndex]
      const box = tab.objectLayoutBoxes[sourceBoxIndex]
      const rows = Array.from(box.objectLayoutRows)
      const [movedRow] = rows.splice(source.index, 1)
      rows.splice(destination.index, 0, movedRow)
      box.objectLayoutRows = rows
      setJsonData(newJsonData)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          let json = JSON.parse(event.target?.result as string)
          // Replace 'pt_BR' keys with selectedLanguage
          json = replaceLanguageKeys(json, 'pt_BR', selectedLanguage)
          setFullJsonData(json)
          setJsonData(json.objectLayouts[0])

          // Extract available fields where 'system' is false
          if (json.objectFields) {
            const fields = json.objectFields.filter(
              (field: any) => field.system === false
            )
            setAvailableFields(fields)
          }
        } catch (error) {
          alert('Invalid JSON file')
        }
      }
      reader.readAsText(file)
    }
  }

  const replaceLanguageKeys = (
    obj: any,
    oldKey: string,
    newKey: string
  ): any => {
    if (Array.isArray(obj)) {
      return obj.map((item) => replaceLanguageKeys(item, oldKey, newKey))
    } else if (obj !== null && typeof obj === 'object') {
      const newObj: any = {}
      for (const key of Object.keys(obj)) {
        if (key === oldKey) {
          newObj[newKey] = replaceLanguageKeys(obj[key], oldKey, newKey)
        } else {
          newObj[key] = replaceLanguageKeys(obj[key], oldKey, newKey)
        }
      }
      return newObj
    }
    return obj
  }

  const handleDownload = () => {
    if (!fullJsonData) return

    const jsonString = JSON.stringify(fullJsonData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'edited_layout.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">JSON Liferay Object Layout Editor</h1>
        {/* Language Selector and File Input */}
        <div className="mb-4 flex items-center">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="p-2 border rounded mr-4"
          >
            <option value="pt_BR">Português (Brasil)</option>
            <option value="en_US">English (US)</option>
          </select>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="p-2 border rounded"
          />
          {jsonData && (
            <button
              onClick={handleDownload}
              className="ml-4 p-2 bg-indigo-500 text-white rounded"
            >
              Download JSON
            </button>
          )}
        </div>
        {jsonData ? (
          <div className="flex flex-col lg:flex-row">
            <div className="w-full lg:w-1/2 pr-0 lg:pr-2 mb-4 lg:mb-0">
              <TabEditor
                jsonData={jsonData}
                updateJson={updateJson}
                selectedLanguage={selectedLanguage}
                availableFields={availableFields}
              />
            </div>
            <div className="w-full lg:w-1/2 pl-0 lg:pl-2">
              <JsonViewer jsonData={jsonData} />
            </div>
          </div>
        ) : (
          <p>Please select a language and upload a JSON file to begin.</p>
        )}
      </div>
    </DragDropContext>
  )
}

function TabEditor({
  jsonData,
  updateJson,
  selectedLanguage,
  availableFields
}: {
  jsonData: { objectLayoutTabs: Tab[] }
  updateJson: (newData: { objectLayoutTabs: Tab[] }) => void
  selectedLanguage: string
  availableFields: any[]
}) {
  const addTab = () => {
    const newTab: Tab = {
      name: { [selectedLanguage]: 'New Tab' },
      objectLayoutBoxes: [],
      priority: 0
    }
    updateJson({
      ...jsonData,
      objectLayoutTabs: [...jsonData.objectLayoutTabs, newTab]
    })
  }

  const updateTab = (index: number, newTabData: Tab) => {
    const newTabs = [...jsonData.objectLayoutTabs]
    newTabs[index] = newTabData
    updateJson({ ...jsonData, objectLayoutTabs: newTabs })
  }

  const removeTab = (index: number) => {
    const newTabs = jsonData.objectLayoutTabs.filter((_, i) => i !== index)
    updateJson({ ...jsonData, objectLayoutTabs: newTabs })
  }

  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold mb-2">Tabs</h2>
      {jsonData.objectLayoutTabs.map((tab, index) => (
        <TabItem
          key={index}
          tab={tab}
          tabIndex={index}
          updateTab={(newTabData) => updateTab(index, newTabData)}
          removeTab={() => removeTab(index)}
          selectedLanguage={selectedLanguage}
          availableFields={availableFields}
        />
      ))}
      <button
        onClick={addTab}
        className="mt-2 p-2 bg-blue-500 text-white rounded flex items-center"
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        Add Tab
      </button>
    </div>
  )
}

function TabItem({
  tab,
  tabIndex,
  updateTab,
  removeTab,
  selectedLanguage,
  availableFields
}: {
  tab: Tab
  tabIndex: number
  updateTab: (newTabData: Tab) => void
  removeTab: () => void
  selectedLanguage: string
  availableFields: any[]
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="mb-4 p-4 border rounded">
      <div className="flex items-center mb-2">
        <button onClick={() => setIsExpanded(!isExpanded)} className="mr-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </button>
        <input
          type="text"
          value={tab.name[selectedLanguage] || ''}
          onChange={(e) =>
            updateTab({
              ...tab,
              name: { ...tab.name, [selectedLanguage]: e.target.value },
            })
          }
          placeholder={`Name (${selectedLanguage})`}
          className="flex-grow p-2 border rounded"
        />
        <button onClick={removeTab} className="ml-2 p-1 text-red-500">
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
      {isExpanded && (
        <BoxEditor
          boxes={tab.objectLayoutBoxes}
          tabIndex={tabIndex}
          updateBoxes={(newBoxes) =>
            updateTab({ ...tab, objectLayoutBoxes: newBoxes })
          }
          selectedLanguage={selectedLanguage}
          availableFields={availableFields}
        />
      )}
    </div>
  )
}

function BoxEditor({
  boxes,
  tabIndex,
  updateBoxes,
  selectedLanguage,
  availableFields
}: {
  boxes: Box[]
  tabIndex: number
  updateBoxes: (newBoxes: Box[]) => void
  selectedLanguage: string
  availableFields: any[]
}) {
  const addBox = () => {
    const newBox: Box = {
      objectLayoutRows: [],
      collapsable: false,
      name: { [selectedLanguage]: 'New Box' },
      priority: 0,
      type: 'regular'
    }
    updateBoxes([...boxes, newBox])
  }

  const updateBox = (index: number, newBoxData: Box) => {
    const newBoxes = [...boxes]
    newBoxes[index] = newBoxData
    updateBoxes(newBoxes)
  }

  const removeBox = (index: number) => {
    const newBoxes = boxes.filter((_, i) => i !== index)
    updateBoxes(newBoxes)
  }

  return (
    <div className="ml-4">
      <h3 className="text-lg font-semibold mb-2">Boxes</h3>
      {boxes.map((box, index) => (
        <BoxItem
          key={index}
          box={box}
          tabIndex={tabIndex}
          boxIndex={index}
          updateBox={(newBoxData) => updateBox(index, newBoxData)}
          removeBox={() => removeBox(index)}
          selectedLanguage={selectedLanguage}
          availableFields={availableFields}
        />
      ))}
      <button
        onClick={addBox}
        className="mt-2 p-2 bg-green-500 text-white rounded flex items-center"
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        Add Box
      </button>
    </div>
  )
}

function BoxItem({
  box,
  tabIndex,
  boxIndex,
  updateBox,
  removeBox,
  selectedLanguage,
  availableFields
}: {
  box: Box
  tabIndex: number
  boxIndex: number
  updateBox: (newBoxData: Box) => void
  removeBox: () => void
  selectedLanguage: string
  availableFields: any[]
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="mb-4 p-4 border rounded">
      <div className="flex items-center mb-2">
        <button onClick={() => setIsExpanded(!isExpanded)} className="mr-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </button>
        <input
          type="text"
          value={box.name[selectedLanguage] || ''}
          onChange={(e) =>
            updateBox({
              ...box,
              name: { ...box.name, [selectedLanguage]: e.target.value },
            })
          }
          placeholder={`Name (${selectedLanguage})`}
          className="flex-grow p-2 border rounded"
        />
        <button onClick={removeBox} className="ml-2 p-1 text-red-500">
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
      {isExpanded && (
        <RowEditor
          rows={box.objectLayoutRows}
          tabIndex={tabIndex}
          boxIndex={boxIndex}
          updateRows={(newRows) =>
            updateBox({ ...box, objectLayoutRows: newRows })
          }
          availableFields={availableFields}
          selectedLanguage={selectedLanguage}
        />
      )}
    </div>
  )
}

function RowEditor({
  rows,
  tabIndex,
  boxIndex,
  updateRows,
  availableFields,
  selectedLanguage
}: {
  rows: Row[]
  tabIndex: number
  boxIndex: number
  updateRows: (newRows: Row[]) => void
  availableFields: any[]
  selectedLanguage: string
}) {
  const addRow = () => {
    const newRow: Row = {
      objectLayoutColumns: [],
      priority: 0
    }
    updateRows([...rows, newRow])
  }

  const updateRow = (index: number, newRowData: Row) => {
    const newRows = [...rows]
    newRows[index] = newRowData
    updateRows(newRows)
  }

  const removeRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index)
    updateRows(newRows)
  }

  const droppableId = `${tabIndex}-${boxIndex}`

  return (
    <Droppable droppableId={droppableId}>
      {(provided) => (
        <div
          {...provided.droppableProps}
          ref={provided.innerRef}
          className="ml-4"
        >
          <h4 className="text-md font-semibold mb-2">Rows</h4>
          {rows.map((row, index) => (
            <Draggable
              key={`${tabIndex}-${boxIndex}-${index}`}
              draggableId={`${tabIndex}-${boxIndex}-${index}`}
              index={index}
            >
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  className="mb-4 p-4 border rounded bg-white"
                >
                  <RowItem
                    row={row}
                    updateRow={(newRowData) => updateRow(index, newRowData)}
                    removeRow={() => removeRow(index)}
                    dragHandleProps={provided.dragHandleProps}
                    availableFields={availableFields}
                    selectedLanguage={selectedLanguage}
                  />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
          <button
            onClick={addRow}
            className="mt-2 p-2 bg-yellow-500 text-white rounded flex items-center"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Row
          </button>
        </div>
      )}
    </Droppable>
  )
}

function RowItem({
  row,
  updateRow,
  removeRow,
  dragHandleProps,
  availableFields,
  selectedLanguage
}: {
  row: Row
  updateRow: (newRowData: Row) => void
  removeRow: () => void
  dragHandleProps: any
  availableFields: any[]
  selectedLanguage: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div>
      <div className="flex items-center mb-2">
        <div {...dragHandleProps} className="mr-2 cursor-move">
          <GripVerticalIcon className="w-4 h-4" />
        </div>
        <button onClick={() => setIsExpanded(!isExpanded)} className="mr-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </button>
        <span className="flex-grow">Row</span>
        <button onClick={removeRow} className="ml-2 p-1 text-red-500">
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
      {isExpanded && (
        <ColumnEditor
          columns={row.objectLayoutColumns}
          updateColumns={(newColumns) =>
            updateRow({ ...row, objectLayoutColumns: newColumns })
          }
          availableFields={availableFields}
          selectedLanguage={selectedLanguage}
        />
      )}
    </div>
  )
}

function ColumnEditor({
  columns,
  updateColumns,
  availableFields,
  selectedLanguage
}: {
  columns: Column[]
  updateColumns: (newColumns: Column[]) => void
  availableFields: any[]
  selectedLanguage: string
}) {
  const addColumn = () => {
    const newColumn: Column = {
      objectFieldName: '',
      size: 4,
      priority: 0
    }
    updateColumns([...columns, newColumn])
  }

  const updateColumn = (
    index: number,
    field: keyof Column,
    value: string | number
  ) => {
    const newColumns = [...columns]
    newColumns[index] = { ...newColumns[index], [field]: value }
    updateColumns(newColumns)
  }

  const removeColumn = (index: number) => {
    const newColumns = columns.filter((_, i) => i !== index)
    updateColumns(newColumns)
  }

  return (
    <div className="ml-4">
      <h5 className="text-sm font-semibold mb-2">Columns</h5>
      {columns.map((column, index) => (
        <div key={index} className="mb-2 flex space-x-2 items-center">
          <select
            value={column.objectFieldName}
            onChange={(e) =>
              updateColumn(index, 'objectFieldName', e.target.value)
            }
            className="p-1 border rounded flex-grow"
          >
            <option value="">Select Field</option>
            {availableFields.map((field) => (
              <option key={field.name} value={field.name}>
                {field.label && field.label[selectedLanguage]
                  ? field.label[selectedLanguage]
                  : field.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={column.size}
            onChange={(e) =>
              updateColumn(index, 'size', parseInt(e.target.value))
            }
            placeholder="Size"
            className="p-1 border rounded w-16"
          />
          <input
            type="number"
            value={column.priority}
            onChange={(e) =>
              updateColumn(index, 'priority', parseInt(e.target.value))
            }
            placeholder="Priority"
            className="p-1 border rounded w-16"
          />
          <button
            onClick={() => removeColumn(index)}
            className="p-1 text-red-500"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addColumn}
        className="mt-2 p-2 bg-purple-500 text-white rounded flex items-center"
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        Add Column
      </button>
    </div>
  )
}

function JsonViewer({ jsonData }: { jsonData: any }) {
  return (
    <div className="bg-gray-100 p-4 rounded">
      <h2 className="text-xl font-semibold mb-2">JSON Output</h2>
      <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-[calc(100vh-200px)]">
        {JSON.stringify(jsonData, null, 2)}
      </pre>
    </div>
  )
}
