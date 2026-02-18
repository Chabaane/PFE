using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;


namespace AgricultureApp.Models.DTOs
{
    public class AgriculteurUpdateDto
    {
        public string? Nom { get; set; }
        public string? Prenom { get; set; }
        public string? Telephone { get; set; }
        public string? Localisation { get; set; }
    }
}