using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelProject.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRouteShare : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RouteShares",
                schema: "public");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RouteShares",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RouteId = table.Column<Guid>(type: "uuid", nullable: false),
                    SharedWithUserId = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RouteShares", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RouteShares_AspNetUsers_SharedWithUserId",
                        column: x => x.SharedWithUserId,
                        principalSchema: "Identity",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RouteShares_Routes_RouteId",
                        column: x => x.RouteId,
                        principalSchema: "public",
                        principalTable: "Routes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RouteShares_RouteId_SharedWithUserId",
                schema: "public",
                table: "RouteShares",
                columns: new[] { "RouteId", "SharedWithUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RouteShares_SharedWithUserId",
                schema: "public",
                table: "RouteShares",
                column: "SharedWithUserId");
        }
    }
}
