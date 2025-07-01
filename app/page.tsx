"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CalendarIcon, Trash2, Search, BarChart3, Settings, Database, HardDrive } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface Record {
  id?: number
  names: string[]
  date: string
  type: "overtime" | "leave"
  duration: "full" | "morning" | "afternoon"
  created_at?: string
}

interface Statistics {
  name: string
  overtimeCount: number
  leaveCount: number
  overtimeDays: number
  leaveDays: number
}

// 存储服务类
class StorageService {
  private useSQLite: boolean

  constructor(useSQLite = false) {
    this.useSQLite = useSQLite
  }

  setStorageMode(useSQLite: boolean) {
    this.useSQLite = useSQLite
  }

  async getRecords(): Promise<Record[]> {
    if (this.useSQLite) {
      try {
        const response = await fetch("/api/records")
        if (!response.ok) throw new Error("Failed to fetch records from SQLite")
        const records = await response.json()
        return records.map((record: any) => ({
          ...record,
          created_at: record.created_at || new Date().toISOString(),
        }))
      } catch (error) {
        console.error("SQLite fetch failed, falling back to localStorage:", error)
        return this.getLocalRecords()
      }
    } else {
      return this.getLocalRecords()
    }
  }

  async saveRecord(record: Omit<Record, "id">): Promise<Record> {
    if (this.useSQLite) {
      try {
        const response = await fetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        })
        if (!response.ok) throw new Error("Failed to save record to SQLite")
        const savedRecord = await response.json()
        return savedRecord
      } catch (error) {
        console.error("SQLite save failed, falling back to localStorage:", error)
        return this.saveLocalRecord(record)
      }
    } else {
      return this.saveLocalRecord(record)
    }
  }

  async deleteRecord(id: number | string): Promise<void> {
    if (this.useSQLite) {
      try {
        const response = await fetch(`/api/records?id=${id}`, {
          method: "DELETE",
        })
        if (!response.ok) throw new Error("Failed to delete record from SQLite")
      } catch (error) {
        console.error("SQLite delete failed, falling back to localStorage:", error)
        this.deleteLocalRecord(id.toString())
      }
    } else {
      this.deleteLocalRecord(id.toString())
    }
  }

  private getLocalRecords(): Record[] {
    if (typeof window === "undefined") return []

    const savedRecords = localStorage.getItem("attendance-records")
    if (savedRecords) {
      const loadedRecords = JSON.parse(savedRecords)
      return loadedRecords.map((record: any) => ({
        ...record,
        duration: record.duration || "full",
        created_at: record.created_at || new Date().toISOString(),
      }))
    }
    return []
  }

  private saveLocalRecord(record: Omit<Record, "id">): Record {
    const newRecord: Record = {
      id: Date.now(),
      ...record,
      created_at: record.created_at || new Date().toISOString(),
    }

    const existingRecords = this.getLocalRecords()
    const updatedRecords = [newRecord, ...existingRecords]

    if (typeof window !== "undefined") {
      localStorage.setItem("attendance-records", JSON.stringify(updatedRecords))
    }

    return newRecord
  }

  private deleteLocalRecord(id: string): void {
    const existingRecords = this.getLocalRecords()
    const filteredRecords = existingRecords.filter((record) => record.id?.toString() !== id)

    if (typeof window !== "undefined") {
      localStorage.setItem("attendance-records", JSON.stringify(filteredRecords))
    }
  }
}

// 将RecordForm组件移到主组件外部
const RecordForm = ({
  type,
  nameInput,
  setNameInput,
  selectedDate,
  setSelectedDate,
  duration,
  setDuration,
  addRecord,
}: {
  type: "overtime" | "leave"
  nameInput: string
  setNameInput: (value: string) => void
  selectedDate: Date | undefined
  setSelectedDate: (date: Date | undefined) => void
  duration: string
  setDuration: (duration: string) => void
  addRecord: (type: "overtime" | "leave") => void
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{type === "overtime" ? "加班记录" : "请假记录"}</CardTitle>
      <CardDescription>输入人名（用空格或回车分隔多个人名），选择日期和时长并保存记录</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`names-${type}`}>人名</Label>
        <Input
          id={`names-${type}`}
          placeholder="输入人名，用空格或回车分隔多个人名"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              addRecord(type)
            }
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        <p className="text-sm text-muted-foreground">
          提示：可以输入多个人名，用空格或回车分隔。按 Ctrl+Enter 快速保存。
        </p>
      </div>

      <div className="space-y-2">
        <Label>日期</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "yyyy年MM月dd日") : "选择日期"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>时长</Label>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">全天</SelectItem>
            <SelectItem value="morning">上午（半天）</SelectItem>
            <SelectItem value="afternoon">下午（半天）</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={() => addRecord(type)} className="w-full" disabled={!nameInput.trim() || !selectedDate}>
        保存{type === "overtime" ? "加班" : "请假"}记录
      </Button>
    </CardContent>
  </Card>
)

export default function AttendanceTracker() {
  const [nameInput, setNameInput] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [duration, setDuration] = useState("full")
  const [records, setRecords] = useState<Record[]>([])
  const [filterDate, setFilterDate] = useState<Date>()
  const [filterType, setFilterType] = useState<string>("all")
  const [filterMonth, setFilterMonth] = useState<string>("")
  const [filterYear, setFilterYear] = useState<string>("")
  const [searchName, setSearchName] = useState("")
  const [statsFilterMonth, setStatsFilterMonth] = useState<string>("all")
  const [statsFilterYear, setStatsFilterYear] = useState<string>("all")
  const [statsFilterType, setStatsFilterType] = useState<string>("all")
  const [useSQLite, setUseSQLite] = useState(false) // 默认使用localStorage
  const [loading, setLoading] = useState(false)
  const [storageService] = useState(() => new StorageService(false)) // 默认localStorage

  // 加载记录
  const loadRecords = async () => {
    setLoading(true)
    try {
      const loadedRecords = await storageService.getRecords()
      setRecords(loadedRecords)
    } catch (error) {
      console.error("Failed to load records:", error)
    } finally {
      setLoading(false)
    }
  }

  // 初始化加载记录
  useEffect(() => {
    loadRecords()
  }, [])

  // 切换存储方式时重新加载数据
  useEffect(() => {
    storageService.setStorageMode(useSQLite)
    loadRecords()
  }, [useSQLite])

  // 处理人名输入，支持回车和空格分隔
  const parseNames = (input: string): string[] => {
    return input
      .split(/[\s\n]+/)
      .map((name) => name.trim())
      .filter((name) => name.length > 0)
  }

  // 添加记录
  const addRecord = async (type: "overtime" | "leave") => {
    if (!nameInput.trim() || !selectedDate) {
      alert("请输入人名和选择日期")
      return
    }

    const names = parseNames(nameInput)
    if (names.length === 0) {
      alert("请输入有效的人名")
      return
    }

    setLoading(true)
    try {
      const newRecord = await storageService.saveRecord({
        names,
        date: format(selectedDate, "yyyy-MM-dd"),
        type,
        duration: duration as "full" | "morning" | "afternoon",
        created_at: new Date().toISOString(),
      })

      setRecords((prev) => [newRecord, ...prev])
      setNameInput("")
      setSelectedDate(undefined)
      setDuration("full")
    } catch (error) {
      console.error("Failed to save record:", error)
      alert("保存记录失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  // 删除记录
  const deleteRecord = async (record: Record) => {
    const id = record.id
    if (!id) return

    setLoading(true)
    try {
      await storageService.deleteRecord(id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
    } catch (error) {
      console.error("Failed to delete record:", error)
      alert("删除记录失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  // 获取可用的年份和月份
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    records.forEach((record) => {
      years.add(record.date.substring(0, 4))
    })
    return Array.from(years).sort().reverse()
  }, [records])

  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    records.forEach((record) => {
      if (!filterYear || record.date.startsWith(filterYear)) {
        months.add(record.date.substring(0, 7))
      }
    })
    return Array.from(months).sort().reverse()
  }, [records, filterYear])

  // 筛选记录
  const filteredRecords = records.filter((record) => {
    const matchesDate = !filterDate || record.date === format(filterDate, "yyyy-MM-dd")
    const matchesType = filterType === "all" || record.type === filterType
    const matchesMonth = !filterMonth || record.date.startsWith(filterMonth)
    const matchesYear = !filterYear || record.date.startsWith(filterYear)
    const matchesName =
      !searchName || record.names.some((name) => name.toLowerCase().includes(searchName.toLowerCase()))
    return matchesDate && matchesType && matchesMonth && matchesYear && matchesName
  })

  // 计算统计数据
  const statistics = useMemo(() => {
    const statsMap = new Map<string, Statistics>()

    const statsFilteredRecords = records.filter((record) => {
      const matchesType = statsFilterType === "all" || record.type === statsFilterType
      const matchesMonth = statsFilterMonth === "all" || record.date.startsWith(statsFilterMonth)
      const matchesYear = statsFilterYear === "all" || record.date.startsWith(statsFilterYear)
      return matchesType && matchesMonth && matchesYear
    })

    statsFilteredRecords.forEach((record) => {
      record.names.forEach((name) => {
        if (!statsMap.has(name)) {
          statsMap.set(name, {
            name,
            overtimeCount: 0,
            leaveCount: 0,
            overtimeDays: 0,
            leaveDays: 0,
          })
        }

        const stats = statsMap.get(name)!
        const dayValue = record.duration === "full" ? 1 : 0.5

        if (record.type === "overtime") {
          stats.overtimeCount++
          stats.overtimeDays += dayValue
        } else {
          stats.leaveCount++
          stats.leaveDays += dayValue
        }
      })
    })

    return Array.from(statsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [records, statsFilterType, statsFilterMonth, statsFilterYear])

  // 格式化时长显示
  const formatDuration = (duration: string) => {
    switch (duration) {
      case "full":
        return "全天"
      case "morning":
        return "上午"
      case "afternoon":
        return "下午"
      default:
        return "全天"
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">考勤记录管理系统</h1>
            <p className="text-muted-foreground">管理员工的加班和请假记录</p>
          </div>
          <Card className="w-80">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                存储设置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {useSQLite ? (
                    <Database className="h-4 w-4 text-green-600" />
                  ) : (
                    <HardDrive className="h-4 w-4 text-blue-600" />
                  )}
                  <Label htmlFor="storage-mode" className="text-sm">
                    {useSQLite ? "SQLite 数据库" : "本地存储"}
                  </Label>
                </div>
                <Switch id="storage-mode" checked={useSQLite} onCheckedChange={setUseSQLite} disabled={loading} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {useSQLite
                  ? "数据存储在 SQLite 数据库文件中，支持持久化存储和备份"
                  : "数据存储在浏览器本地，简单快速，适合个人使用"}
              </p>
              {!useSQLite && <p className="text-xs text-orange-600 mt-1">默认模式：数据仅保存在当前浏览器中</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>处理中...</span>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="overtime" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overtime">加班记录</TabsTrigger>
          <TabsTrigger value="leave">请假记录</TabsTrigger>
          <TabsTrigger value="records">查看记录</TabsTrigger>
          <TabsTrigger value="statistics">统计分析</TabsTrigger>
        </TabsList>

        <TabsContent value="overtime">
          <RecordForm
            type="overtime"
            nameInput={nameInput}
            setNameInput={setNameInput}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            duration={duration}
            setDuration={setDuration}
            addRecord={addRecord}
          />
        </TabsContent>

        <TabsContent value="leave">
          <RecordForm
            type="leave"
            nameInput={nameInput}
            setNameInput={setNameInput}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            duration={duration}
            setDuration={setDuration}
            addRecord={addRecord}
          />
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>记录筛选</CardTitle>
              <CardDescription>筛选和查看所有记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>按姓名搜索</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索姓名"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="pl-8"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>按年份筛选</Label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择年份" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部年份</SelectItem>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}年
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>按月份筛选</Label>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择月份" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部月份</SelectItem>
                      {availableMonths.map((month) => (
                        <SelectItem key={month} value={month}>
                          {format(new Date(month + "-01"), "yyyy年MM月")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>按日期筛选</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filterDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterDate ? format(filterDate, "MM-dd") : "选择日期"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={filterDate} onSelect={setFilterDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>按类型筛选</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部记录</SelectItem>
                      <SelectItem value="overtime">加班记录</SelectItem>
                      <SelectItem value="leave">请假记录</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterDate(undefined)
                    setFilterType("all")
                    setFilterMonth("")
                    setFilterYear("")
                    setSearchName("")
                  }}
                >
                  清除筛选
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>记录列表 ({filteredRecords.length} 条记录)</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无记录</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>类型</TableHead>
                        <TableHead>人员</TableHead>
                        <TableHead>日期</TableHead>
                        <TableHead>时长</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <span
                              className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                record.type === "overtime"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800",
                              )}
                            >
                              {record.type === "overtime" ? "加班" : "请假"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {record.names.map((name, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 rounded text-sm">
                                  {name}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                              {formatDuration(record.duration)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {record.created_at && format(new Date(record.created_at), "MM-dd HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRecord(record)}
                              className="text-red-600 hover:text-red-800"
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                统计分析筛选
              </CardTitle>
              <CardDescription>选择要统计的时间范围和类型</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>按年份筛选</Label>
                  <Select value={statsFilterYear} onValueChange={setStatsFilterYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择年份" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部年份</SelectItem>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}年
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>按月份筛选</Label>
                  <Select value={statsFilterMonth} onValueChange={setStatsFilterMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择月份" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部月份</SelectItem>
                      {availableMonths.map((month) => (
                        <SelectItem key={month} value={month}>
                          {format(new Date(month + "-01"), "yyyy年MM月")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>按类型筛选</Label>
                  <Select value={statsFilterType} onValueChange={setStatsFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部记录</SelectItem>
                      <SelectItem value="overtime">仅加班记录</SelectItem>
                      <SelectItem value="leave">仅请假记录</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatsFilterMonth("all")
                    setStatsFilterYear("all")
                    setStatsFilterType("all")
                  }}
                >
                  清除筛选
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                统计结果
              </CardTitle>
              <CardDescription>
                {statsFilterYear === "all" ? "全部时间" : `${statsFilterYear}年`}
                {statsFilterMonth === "all" ? "" : `${format(new Date(statsFilterMonth + "-01"), "MM月")}`}
                {statsFilterYear === "all" && statsFilterMonth === "all" && "全部时间"}
                {statsFilterType !== "all" && `的${statsFilterType === "overtime" ? "加班" : "请假"}统计`}
                {statsFilterType === "all" && "的考勤统计"}
                （共 {statistics.reduce((sum, stat) => sum + stat.overtimeCount + stat.leaveCount, 0)} 条记录）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statistics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无统计数据</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>姓名</TableHead>
                        <TableHead className="text-center">加班次数</TableHead>
                        <TableHead className="text-center">加班天数</TableHead>
                        <TableHead className="text-center">请假次数</TableHead>
                        <TableHead className="text-center">请假天数</TableHead>
                        <TableHead className="text-center">总计次数</TableHead>
                        <TableHead className="text-center">总计天数</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statistics.map((stat) => (
                        <TableRow key={stat.name}>
                          <TableCell className="font-medium">{stat.name}</TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                              {stat.overtimeCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm">
                              {stat.overtimeDays}天
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                              {stat.leaveCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm">
                              {stat.leaveDays}天
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">
                              {stat.overtimeCount + stat.leaveCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-sm font-medium">
                              {stat.overtimeDays + stat.leaveDays}天
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
