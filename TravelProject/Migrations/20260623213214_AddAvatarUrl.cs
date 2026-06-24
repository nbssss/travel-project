using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelProject.Migrations
{
    /// <inheritdoc />
    public partial class AddAvatarUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AvatarUrl",
                schema: "Identity",
                table: "AspNetUsers",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvatarUrl",
                schema: "Identity",
                table: "AspNetUsers");
        }
    }
}
