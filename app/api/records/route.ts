import { type NextRequest, NextResponse } from "next/server"
import SQLiteService from "@/lib/sqlite"

export async function GET() {
  try {
    const sqliteService = new SQLiteService()
    const records = sqliteService.getAllRecords()
    return NextResponse.json(records)
  } catch (error) {
    console.error("Error fetching records:", error)
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sqliteService = new SQLiteService()
    const record = sqliteService.createRecord(body)
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error("Error creating record:", error)
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 })
    }

    const sqliteService = new SQLiteService()
    const success = sqliteService.deleteRecord(Number.parseInt(id))

    if (!success) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Record deleted successfully" })
  } catch (error) {
    console.error("Error deleting record:", error)
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 })
  }
}
